const BattleSequencer = {
    startWinSequence: function (engine, type, who, score) {
        engine.events.push({ type: 'STOP_MUSIC' });

        let finalScore = score;
        const rawScore = engine.winningYaku ? engine.winningYaku.score : score;
        const attacker = engine.getPlayer(who);
        const defender = engine.getOpponent(who);
        const activeBuffs = [];
        const isRiichi = (who === 'P1') ? engine.p1.isRiichi : engine.cpu.isRiichi;

        if (attacker.buffs && attacker.buffs.attackUp) {
            finalScore = Math.floor(finalScore * 1.25);
            attacker.buffs.attackUp = false;
            activeBuffs.push('CRITICAL');
        }

        if (defender.buffs && defender.buffs.defenseUp) {
            finalScore = Math.floor(finalScore * 0.75);
            defender.buffs.defenseUp = false;
            activeBuffs.push('WATER_MIRROR');
        }

        engine.pendingDamage = { target: who === 'P1' ? 'CPU' : 'P1', amount: finalScore };

        const wy = engine.winningYaku;
        const yakuStr = (wy && (Array.isArray(wy.yaku) ? wy.yaku.join('+') : wy.name)) || '?';
        console.log(`[Round] ${who} WIN — ${type} · ${yakuStr} · ${finalScore} dmg${activeBuffs.length ? ' [' + activeBuffs.join(',') + ']' : ''}`);

        const winner = who === 'P1' ? 'p1' : 'cpu';
        const loser = who === 'P1' ? 'cpu' : 'p1';

        engine.setExpression(who, 'smile');
        engine.setExpression(engine.opponentOf(who), 'shocked');
        engine.triggerDialogue('WIN', winner);
        engine.triggerDialogue('LOSE', loser);

        engine.currentState = engine.STATE_FX_PLAYING;

        const sp = BattleConfig.SPEED;
        const jingle = BattleConfig.RESULT.TYPES[who === 'P1' ? 'WIN' : 'LOSE'].jingle;
        const steps = [
            {
                type: 'CALLBACK', callback: () => {
                    if (who === 'CPU') {
                        engine.cpu.isRevealed = true;
                        engine.sortHand(engine.cpu.hand);
                    }
                    engine.events.push({ type: 'SOUND', id: 'audio/discard' });
                }
            },
            { type: 'WAIT', duration: sp.DIALOGUE_SPEAK },
            { type: 'WAIT_KEY', duration: sp.DIALOGUE_REPLY },
            {
                type: 'CALLBACK', callback: () => {
                    if (jingle) engine.events.push({ type: 'SOUND', id: jingle });
                    engine.showPopup(type, { blocking: true });
                }
            }
        ];

        steps.push({
            type: 'CALLBACK',
            callback: () => {
                engine.sequencing.active = false;
                engine.offerDoraBomb(who, () => { engine.sequencing.active = true; });
            }
        });

        if ((who === 'P1' && engine.p1.isRiichi) || (who === 'CPU' && engine.cpu.isRiichi)) {
            steps.push({ type: 'REVEAL_URA' });
        }

        if (engine.winningYaku) {
            engine.winningYaku.score = score;
        }

        steps.push({ type: 'WAIT_FX' });
        steps.push({
            type: 'CALLBACK',
            callback: () => {
                const winnerHand = (who === 'P1') ? engine.getFullHand(engine.p1) : engine.getFullHand(engine.cpu);

                const bonusResult = engine.calculateBonuses(winnerHand, type, isRiichi, who);
                let totalScore = finalScore + bonusResult.score;
                totalScore = Math.round(totalScore / 10) * 10;

                if (engine.pendingDamage) {
                    engine.pendingDamage.amount = totalScore;
                }

                const resultData = {
                    round: engine.currentRound,
                    result: (who === 'P1') ? '승' : '패',
                    yaku: (engine.winningYaku && engine.winningYaku.yaku && engine.winningYaku.yaku.length > 0) ? engine.winningYaku.yaku[0] : type
                };
                engine.roundHistory.push(resultData);

                engine.resultInfo = {
                    type: (who === 'P1') ? 'WIN' : 'LOSE',
                    baseScore: score,
                    score: totalScore,
                    finalDamage: totalScore,
                    yakuName: engine.winningYaku ? engine.winningYaku.yaku[0] : '',
                    yakuScore: rawScore,
                    bonuses: bonusResult.details,
                    bonusScore: bonusResult.score,
                    activeBuffs: activeBuffs
                };
            }
        });

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

        const p1Tenpai = engine.checkTenpai(engine.getFullHand(engine.p1), false, engine.isOpen(engine.p1));
        const cpuTenpai = engine.checkTenpai(engine.getFullHand(engine.cpu), false, engine.isOpen(engine.cpu));

        const damageResult = engine.calculateTenpaiDamage(p1Tenpai, cpuTenpai);
        const damageMsg = damageResult.msg;
        const damage = damageResult.damage;

        console.log(`[Round] NAGARI — P1 ${p1Tenpai ? '텐파이' : '노텐'} / CPU ${cpuTenpai ? '텐파이' : '노텐'} · ${damage} dmg`);

        const p1Tx = p1Tenpai ? BattleConfig.STATUS_TEXTS.TENPAI : BattleConfig.STATUS_TEXTS.NOTEN;
        const cpuTx = cpuTenpai ? BattleConfig.STATUS_TEXTS.TENPAI : BattleConfig.STATUS_TEXTS.NOTEN;

        engine.setExpression('P1', p1Tenpai ? 'smile' : 'shocked');
        engine.setExpression('CPU', cpuTenpai ? 'smile' : 'shocked');

        const resultData = {
            round: engine.currentRound,
            result: '무승부',
            yaku: '-'
        };
        engine.roundHistory.push(resultData);

        const tenpaiOf = [0, 1].map(seat => engine.whoAt(seat) === 'P1' ? p1Tenpai : cpuTenpai);
        const lastChanceSteps = [0, 1].map(seat => ({
            type: 'CALLBACK', callback: () => {
                if (engine.currentState !== engine.STATE_FX_PLAYING) return;
                engine.offerLastChance(engine.whoAt(seat), tenpaiOf[seat]);
            }
        }));

        const steps = [
            ...lastChanceSteps,
            {
                type: 'CALLBACK', callback: () => {
                    if (engine.currentState === engine.STATE_FX_PLAYING) {
                        engine.showPopup('NAGARI', {
                            blocking: true,
                            labels: { bottom: p1Tenpai ? 'fx/tenpai' : 'fx/noten', top: cpuTenpai ? 'fx/tenpai' : 'fx/noten' }
                        });
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

    stepHandlers: {
        WAIT: function (engine, step, dt) {
            engine.sequencing.timer += dt;
            if (engine.sequencing.timer >= step.duration) {
                engine.sequencing.timer = 0;
                BattleSequencer.advance(engine);
            }
        },
        WAIT_KEY: function (engine, step, dt) {
            engine.sequencing.timer += dt;
            const pressed = typeof Input !== 'undefined' && (Input.isConfirmKey() || Input.isMouseJustPressed());
            if (engine.isAutoTest() || pressed || engine.sequencing.timer >= step.duration) {
                engine.sequencing.timer = 0;
                if (pressed && typeof BattleDialogue !== 'undefined') BattleDialogue.hideAll();
                BattleSequencer.advance(engine);
            }
        },
        DIALOGUE: function (engine, step) {
            engine.triggerDialogue(step.key, step.who, step.fallbackKey);
            BattleSequencer.advance(engine);
        },
        WAIT_FX: function (engine) {
            if (engine.scene && engine.scene.fx && engine.scene.fx.list.length > 0) {
                return;
            }
            BattleSequencer.advance(engine);
        },
        FX: function (engine, step) {
            engine.playFX(step.asset, step.x, step.y, { scale: step.scale, life: step.life, blocking: step.blocking });
            BattleSequencer.advance(engine);
        },
        REVEAL_HAND: function (engine) {
            engine.cpu.isRevealed = true;
            engine.sortHand(engine.cpu.hand);
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

            if (engine.sequencing === prevSeq) {
                BattleSequencer.advance(engine);
            }
        },
        STATE_NAGARI: function (engine) {
            engine.currentState = engine.STATE_NAGARI;
            engine.calculateTenpaiDamage(true);
            engine.sequencing.active = false;
        },
        DORA_ROULETTE: function (engine, step, dt) {
            if (!engine.doras.length) { BattleSequencer.advance(engine); return; }
            if (step.left === undefined) step.left = 26 + engine.rng.fx.int(26);
            engine.sequencing.timer += dt;
            if (engine.sequencing.timer < 2) return;
            engine.sequencing.timer = 0;
            const types = PaiData.TYPES;
            const idx = types.findIndex(t => t.id === engine.doras[0].type);
            const next = types[(idx + 1) % types.length];
            engine.doras[0] = { type: next.id, color: next.color, img: next.img };
            if (step.sound) engine.events.push({ type: 'SOUND', id: step.sound });
            if (--step.left <= 0) BattleSequencer.advance(engine);
        },
        DEAL: function (engine, step) {
            const player = engine.playerAt(step.seat);
            player.hand = player.hand.concat(engine.drawTiles(step.count));

            if (step.sound) {
                engine.events.push({ type: 'SOUND', id: step.sound });
            }
            BattleSequencer.advance(engine);
        },
        FACE_DOWN: function (engine, step) {
            engine.p1.isFaceDown = true;
            if (step.sound) {
                engine.events.push({ type: 'SOUND', id: step.sound });
            }
            BattleSequencer.advance(engine);
        },
        FLIP_HAND: function (engine, step) {
            engine.p1.isFaceDown = false;
            engine.sortHand(engine.p1.hand);
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
            console.warn(`Unknown sequence step type: ${step.type}`);
            BattleSequencer.advance(engine);
        }
    }
};
