// Battle show direction: builds and runs the win / nagari sequences and the
// generic step runner that BattleEngine state-machine drives each tick.
// Pattern matches SkillFlows: functions take the engine as the first argument,
// so the rules engine itself stays free of choreography.
//
// Sequencing STATE (engine.sequencing = { active, steps, currentStep, timer })
// stays on the engine; small inline sequences (deal, CPU riichi) are still
// assembled there as plain step data — this module owns how steps RUN and the
// two large result shows.

const BattleSequencer = {
    startWinSequence: function (engine, type, who, score) {
        engine.events.push({ type: 'STOP_MUSIC' });

        // Calculate Skill Modified Score
        let finalScore = score;
        const attacker = engine.getPlayer(who);
        const defender = engine.getOpponent(who);
        const activeBuffs = [];
        const isRiichi = (who === 'P1') ? engine.p1.isRiichi : engine.cpu.isRiichi;

        // DORA_BOMB Logic (CPU Auto-Use)
        if (who === 'CPU' && isRiichi && attacker.id === 'rinxiang') {
            SkillFlows.applyDoraBomb(engine, attacker, who);
        }

        // Attack Up (CRITICAL)
        if (attacker.buffs && attacker.buffs.attackUp) {
            finalScore = Math.floor(finalScore * 1.25);
            attacker.buffs.attackUp = false; // Consume Buff;
            activeBuffs.push('CRITICAL');
        }

        // Defense Up (WATER MIRROR) on Defender
        if (defender.buffs && defender.buffs.defenseUp) {
            finalScore = Math.floor(finalScore * 0.75);
            defender.buffs.defenseUp = false; // Consume Buff
            activeBuffs.push('WATER_MIRROR');
        }

        // Prepare Data
        engine.pendingDamage = { target: who === 'P1' ? 'CPU' : 'P1', amount: finalScore };

        const wy = engine.winningYaku;
        const yakuStr = (wy && (Array.isArray(wy.yaku) ? wy.yaku.join('+') : wy.name)) || '?';
        console.log(`[Round] ${who} WIN — ${type} · ${yakuStr} · ${finalScore} dmg${activeBuffs.length ? ' [' + activeBuffs.join(',') + ']' : ''}`);

        const winner = who === 'P1' ? 'p1' : 'cpu';
        const loser = who === 'P1' ? 'cpu' : 'p1';

        // Visuals & Dialogue (Immediate)
        engine.setExpression(who, 'smile');
        engine.setExpression(engine.opponentOf(who), 'shocked');
        engine.triggerDialogue('WIN', winner);
        engine.triggerDialogue('LOSE', loser);

        // Build Sequence (FX -> Result Screen)
        engine.currentState = engine.STATE_FX_PLAYING;

        const steps = [
            { type: 'WAIT', duration: BattleConfig.SPEED.WIN_WAIT },
            { type: 'REVEAL_HAND' }
        ];

        // Insert DORA_BOMB Confirmation Step (Player only)
        if (BattleConfig.RULES.SKILLS_ENABLED && who === 'P1' && isRiichi && attacker.id === 'rinxiang') {
            const skillId = 'DORA_BOMB';
            const skill = SkillData[skillId];
            if (skill && attacker.mp >= skill.cost) {
                steps.push({
                    type: 'CALLBACK',
                    callback: () => {
                        if (engine.scene && engine.scene.showConfirm) {
                            // Pause Sequence (Visuals pause on current frame)
                            engine.sequencing.active = false;

                            engine.scene.showConfirm(
                                '도라폭진을 사용하시겠습니까?',
                                () => {
                                    // YES
                                    SkillFlows.applyDoraBomb(engine, attacker, who);
                                    // Resume Sequence
                                    engine.sequencing.active = true;
                                },
                                () => {
                                    // NO
                                    // Resume Sequence
                                    engine.sequencing.active = true;
                                }
                            );
                        }
                    }
                });
            }
        }

        // Reveal Ura Dora if Riichi
        if ((who === 'P1' && engine.p1.isRiichi) || (who === 'CPU' && engine.cpu.isRiichi)) {
            steps.push({ type: 'REVEAL_URA' });
        }

        // Add Win/Lose Sound to Sequence
        if (who === 'P1') {
            const sound = BattleConfig.RESULT.TYPES.WIN.sound;
            if (sound) steps.push({ type: 'SOUND', id: sound });
        } else {
            const sound = BattleConfig.RESULT.TYPES.LOSE.sound;
            if (sound) steps.push({ type: 'SOUND', id: sound });
        }

        // Calculate Bonuses & Final Result Logic
        if (engine.winningYaku) {
            engine.winningYaku.score = score; // Use Base Score for Yaku display
        }

        // Note: Bonuses calculated LATER in sequence execution? 
        // No, calculateBonuses reads current state (engine.uraDoras). 
        // Since sequence executes over time, logic used to be pre-calculated here.
        // FIX: Move bonus calculation to the STATE transition or a LATE CALLBACK step.
        // However, resultInfo is needed for STATE_WIN/LOSE which is the last step.

        // Let's use a Callback Step before STATE transition to finalize score calculation.
        steps.push({ type: 'WAIT_FX' }); // Wait for any FX (e.g. Ron/Tsumo animations)
        steps.push({
            type: 'CALLBACK',
            callback: () => {
                // Re-calculate score/bonuses here because Ura Dora might have changed
                const winnerHand = (who === 'P1') ? engine.getFullHand(engine.p1) : engine.getFullHand(engine.cpu);
                // isRiichi is still valid from closure

                const bonusResult = engine.calculateBonuses(winnerHand, type, isRiichi);
                let totalScore = finalScore + bonusResult.score;

                // Ensure final score is rounded to nearest 10 (Rule: Handle single digits)
                totalScore = Math.round(totalScore / 10) * 10;

                if (engine.pendingDamage) {
                    engine.pendingDamage.amount = totalScore;
                }

                // Update History
                const resultData = {
                    round: engine.currentRound,
                    result: (who === 'P1') ? '승' : '패',
                    yaku: (engine.winningYaku && engine.winningYaku.yaku && engine.winningYaku.yaku.length > 0) ? engine.winningYaku.yaku[0] : type
                };
                engine.roundHistory.push(resultData);

                // Update Result Info
                engine.resultInfo = {
                    type: (who === 'P1') ? 'WIN' : 'LOSE',
                    baseScore: score,
                    score: totalScore,
                    finalDamage: totalScore,
                    yakuName: engine.winningYaku ? engine.winningYaku.yaku[0] : '',
                    yakuScore: engine.winningYaku ? engine.winningYaku.score : 0,
                    bonuses: bonusResult.details,
                    bonusScore: bonusResult.score,
                    activeBuffs: activeBuffs
                };

                // Update the STATE step's score if needed (though state usually reads resultInfo)
            }
        });

        // Final Step: Transition to STATE_WIN/LOSE
        // Note: Score argument passed to State might be stale if calculated early.
        // But the State usually relies on resultInfo. Let's pass 0 or updated score via closure if possible?
        steps.push({ type: 'STATE', state: (who === 'P1' ? engine.STATE_WIN : engine.STATE_LOSE) });

        engine.sequencing = {
            active: true,
            timer: 0,
            currentStep: 0,
            steps: steps

        };
    },

    startNagariSequence: function (engine) {
        engine.currentState = engine.STATE_FX_PLAYING;
        engine.events.push({ type: 'STOP_MUSIC' });

        // Tenpai checks
        const p1Tenpai = engine.checkTenpai(engine.getFullHand(engine.p1), false);
        const cpuTenpai = engine.checkTenpai(engine.getFullHand(engine.cpu), false);

        // Determine Damage
        // Determine Damage
        const damageResult = engine.calculateTenpaiDamage(p1Tenpai, cpuTenpai);
        const damageMsg = damageResult.msg;
        const damage = damageResult.damage;

        console.log(`[Round] NAGARI — P1 ${p1Tenpai ? '텐파이' : '노텐'} / CPU ${cpuTenpai ? '텐파이' : '노텐'} · ${damage} dmg`);

        const p1Tx = p1Tenpai ? BattleConfig.STATUS_TEXTS.TENPAI : BattleConfig.STATUS_TEXTS.NOTEN;
        const cpuTx = cpuTenpai ? BattleConfig.STATUS_TEXTS.TENPAI : BattleConfig.STATUS_TEXTS.NOTEN;

        // Expressions
        engine.setExpression('P1', p1Tenpai ? 'smile' : 'shocked');

        engine.setExpression('CPU', cpuTenpai ? 'smile' : 'shocked');

        // Create result object
        const resultData = {
            round: engine.currentRound,
            result: '무승부', // Draw
            yaku: '-'
        };
        engine.roundHistory.push(resultData);

        // Visual Sequence
        // "Nagari" Text
        // Show Hands (Reveal CPU)
        // Show Tenpai/Noten status
        // Apply Damage Animation
        // Next Round

        // Setup sequence steps
        const p1X = 150; const p1Y = 300;
        const cpuX = 490; const cpuY = 300;

        const p1Fx = p1Tenpai ? 'fx/tenpai' : 'fx/noten'; // We don't have these images yet. 
        // as `STATE_NAGARI` transitions to `drawResult` which can show the message.

        // Logic for Tenpai/Noten
        const steps = [
            // SKILL: LAST_CHANCE (Before Nagari Finalizes)
            {
                type: 'CALLBACK', callback: () => {
                    const skillId = 'LAST_CHANCE';
                    const player = engine.p1;
                    // Check if Player has skill & is Tenpai
                    if (BattleConfig.RULES.SKILLS_ENABLED && p1Tenpai && player.skills && player.skills.includes(skillId)) {
                        const skill = SkillData[skillId];
                        if (engine.checkSkillCost(skill, 'P1')) {
                            // Pause Sequence handling manually if we show confirmation
                            engine.sequencing.active = false;

                            if (engine.scene && engine.scene.showConfirm) {
                                engine.scene.showConfirm(
                                    (BattleConfig.MESSAGES && BattleConfig.MESSAGES.SKILL_CONFIRM && BattleConfig.MESSAGES.SKILL_CONFIRM[skillId]) ?
                                        BattleConfig.MESSAGES.SKILL_CONFIRM[skillId](skill.cost) : skill.name,
                                    () => {
                                        // YES
                                        engine.activateLastChance('P1');
                                        // activateLastChance handles sequencing state
                                    },
                                    () => {
                                        // NO
                                        engine.sequencing.active = true; // Resume
                                    }
                                );
                            } else {
                                engine.sequencing.active = true; // Safety
                            }
                        }
                    }
                }
            },
            {
                type: 'CALLBACK', callback: () => {
                    // Only continue if not interrupted by Win
                    if (engine.currentState === engine.STATE_FX_PLAYING) {
                        engine.showPopup('NAGARI', { blocking: true });
                        const sound = BattleConfig.RESULT.TYPES.NAGARI.sound;
                        if (sound) engine.events.push({ type: 'SOUND', id: sound });
                    }
                }
            },
            { type: 'WAIT', duration: 30 },
            { type: 'REVEAL_HAND' },
            { type: 'WAIT', duration: 30 },
            {
                type: 'STATE',
                state: engine.STATE_NAGARI,
                score: damage
            }
        ];

        engine.sequencing = {
            active: true,
            timer: 0,
            currentStep: 0,
            steps: steps
        };

        engine.resultInfo = {
            type: 'NAGARI',
            damageMsg: damageMsg,
            score: damage,
            bonuses: [
                { name: engine.p1.name || '플레이어', score: p1Tx },
                { name: engine.cpu.name || '상대', score: cpuTx }
            ],
            p1Status: p1Tx,
            cpuStatus: cpuTx
        };
    },

    // Sequence step handlers. Each handler advances `engine.sequencing` itself:
    // most call BattleSequencer.advance(); WAIT/WAIT_FX stay on the step until
    // their condition is met; STATE/STATE_NAGARI end the sequence.
    stepHandlers: {
        WAIT: function (engine, step, dt) {
            engine.sequencing.timer += dt;
            if (engine.sequencing.timer >= step.duration) {
                engine.sequencing.timer = 0;
                BattleSequencer.advance(engine);
            }
        },
        WAIT_FX: function (engine) {
            if (engine.scene && engine.scene.activeFX && engine.scene.activeFX.length > 0) {
                return; // Wait
            }
            BattleSequencer.advance(engine);
        },
        FX: function (engine, step) {
            engine.playFX(step.asset, step.x, step.y, { scale: step.scale, slideFrom: step.slideFrom, popupType: step.popupType, blocking: step.blocking });
            BattleSequencer.advance(engine);
        },
        FX_PARALLEL: function (engine, step) {
            step.items.forEach(item => {
                engine.playFX(item.asset, item.x, item.y, { scale: item.scale, slideFrom: item.slideFrom });
            });
            BattleSequencer.advance(engine);
        },
        REVEAL_HAND: function (engine) {
            engine.cpu.isRevealed = true;
            engine.sortHand(engine.cpu.hand); // Sort for display
            BattleSequencer.advance(engine);
        },
        REVEAL_URA: function (engine) {
            engine.uraDoraRevealed = true;
            BattleSequencer.advance(engine);
        },
        STATE: function (engine, step) {
            engine.currentState = step.state;
            engine.sequencing.active = false;
        },
        MUSIC: function (engine, step) {
            engine.events.push({ type: 'MUSIC', id: step.id, loop: step.loop });
            BattleSequencer.advance(engine);
        },
        SOUND: function (engine, step) {
            engine.events.push({ type: 'SOUND', id: step.id });
            BattleSequencer.advance(engine);
        },
        CALLBACK: function (engine, step) {
            const prevSeq = engine.sequencing;
            if (step.callback) step.callback();

            // Only advance if the callback didn't replace the whole sequence
            if (engine.sequencing === prevSeq) {
                BattleSequencer.advance(engine);
            }
        },
        STATE_NAGARI: function (engine) {
            // FIX: Must set state to NAGARI to allow input (Next Round)
            engine.currentState = engine.STATE_NAGARI;
            engine.calculateTenpaiDamage(true); // skipFX = true
            engine.sequencing.active = false;
        },
        DEAL: function (engine, step) {
            const newP1 = engine.drawTiles(step.count);
            const newCpu = engine.drawTiles(step.count);
            engine.p1.hand = engine.p1.hand.concat(newP1);
            engine.cpu.hand = engine.cpu.hand.concat(newCpu);

            if (step.sound) {
                engine.events.push({ type: 'SOUND', id: step.sound });
            }
            BattleSequencer.advance(engine);
        },
        FLIP_HAND: function (engine, step) {
            // Reveal player hand (was face down during deal)
            engine.p1.isFaceDown = false;
            engine.sortHand(engine.p1.hand); // Sort immediately on reveal
            if (step.sound) {
                engine.events.push({ type: 'SOUND', id: step.sound });
            }
            BattleSequencer.advance(engine);
        }
    },

    advance: function (engine) {
        engine.sequencing.currentStep++;
    },

    update: function (engine, dt = 1.0) {
        if (!engine.sequencing.active) return;

        const step = engine.sequencing.steps[engine.sequencing.currentStep];
        if (!step) {
            engine.sequencing.active = false;
            return;
        }

        const handler = BattleSequencer.stepHandlers[step.type];
        if (handler) {
            handler(engine, step, dt);
        } else {
            // Unknown step types used to hang the sequence forever — warn and skip instead
            console.warn(`Unknown sequence step type: ${step.type}`);
            BattleSequencer.advance(engine);
        }
    }
};
