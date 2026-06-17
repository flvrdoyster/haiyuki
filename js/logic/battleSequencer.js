// 전투 연출: 승리/나가리 시퀀스와 스텝 러너. SkillFlows처럼 engine을 첫 인자로 받아
// 룰 엔진은 연출에서 자유롭게 둔다. 시퀀싱 상태(engine.sequencing)는 엔진에 있고, 이
// 모듈은 스텝 실행 방식과 두 결과 연출을 소유한다.
const BattleSequencer = {
    startWinSequence: function (engine, type, who, score) {
        engine.events.push({ type: 'STOP_MUSIC' });

        let finalScore = score;
        const attacker = engine.getPlayer(who);
        const defender = engine.getOpponent(who);
        const activeBuffs = [];
        const isRiichi = (who === 'P1') ? engine.p1.isRiichi : engine.cpu.isRiichi;

        if (who === 'CPU' && isRiichi && attacker.id === 'rinxiang') {
            SkillFlows.applyDoraBomb(engine, attacker, who);
        }

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

        const steps = [
            { type: 'WAIT', duration: BattleConfig.SPEED.WIN_WAIT },
            { type: 'REVEAL_HAND' }
        ];

        // 도라폭진 사용 확인(플레이어 한정).
        if (BattleConfig.RULES.SKILLS_ENABLED && who === 'P1' && isRiichi && attacker.id === 'rinxiang') {
            const skillId = 'DORA_BOMB';
            const skill = SkillData[skillId];
            if (skill && attacker.mp >= skill.cost) {
                steps.push({
                    type: 'CALLBACK',
                    callback: () => {
                        if (engine.scene && engine.scene.showConfirm) {
                            engine.sequencing.active = false;
                            engine.scene.showConfirm(
                                '도라폭진을 사용하시겠습니까?',
                                () => {
                                    SkillFlows.applyDoraBomb(engine, attacker, who);
                                    engine.sequencing.active = true;
                                },
                                () => {
                                    engine.sequencing.active = true;
                                }
                            );
                        }
                    }
                });
            }
        }

        if ((who === 'P1' && engine.p1.isRiichi) || (who === 'CPU' && engine.cpu.isRiichi)) {
            steps.push({ type: 'REVEAL_URA' });
        }

        if (who === 'P1') {
            const sound = BattleConfig.RESULT.TYPES.WIN.sound;
            if (sound) steps.push({ type: 'SOUND', id: sound });
        } else {
            const sound = BattleConfig.RESULT.TYPES.LOSE.sound;
            if (sound) steps.push({ type: 'SOUND', id: sound });
        }

        if (engine.winningYaku) {
            engine.winningYaku.score = score;
        }

        // 보너스는 우라도라가 바뀔 수 있어 시퀀스 진행 후(아래 콜백)에 확정한다.
        steps.push({ type: 'WAIT_FX' });
        steps.push({
            type: 'CALLBACK',
            callback: () => {
                const winnerHand = (who === 'P1') ? engine.getFullHand(engine.p1) : engine.getFullHand(engine.cpu);

                const bonusResult = engine.calculateBonuses(winnerHand, type, isRiichi);
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
                    yakuScore: engine.winningYaku ? engine.winningYaku.score : 0,
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

        const p1Tenpai = engine.checkTenpai(engine.getFullHand(engine.p1), false);
        const cpuTenpai = engine.checkTenpai(engine.getFullHand(engine.cpu), false);

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

        const steps = [
            // 나가리 확정 전 LAST_CHANCE(페톰): 텐파이 + 스킬 보유 시 확인 띄움.
            {
                type: 'CALLBACK', callback: () => {
                    const skillId = 'LAST_CHANCE';
                    const player = engine.p1;
                    if (BattleConfig.RULES.SKILLS_ENABLED && p1Tenpai && player.skills && player.skills.includes(skillId)) {
                        const skill = SkillData[skillId];
                        if (engine.checkSkillCost(skill, 'P1')) {
                            engine.sequencing.active = false;

                            if (engine.scene && engine.scene.showConfirm) {
                                engine.scene.showConfirm(
                                    (BattleConfig.MESSAGES && BattleConfig.MESSAGES.SKILL_CONFIRM && BattleConfig.MESSAGES.SKILL_CONFIRM[skillId]) ?
                                        BattleConfig.MESSAGES.SKILL_CONFIRM[skillId](skill.cost) : skill.name,
                                    () => {
                                        engine.activateLastChance('P1');
                                    },
                                    () => {
                                        engine.sequencing.active = true;
                                    }
                                );
                            } else {
                                engine.sequencing.active = true;
                            }
                        }
                    }
                }
            },
            {
                type: 'CALLBACK', callback: () => {
                    // 라스트찬스 승리로 중단되지 않았을 때만 나가리 진행.
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

    // 스텝 핸들러. 각자 engine.sequencing을 직접 진행: 대부분 advance(), WAIT/WAIT_FX는
    // 조건 충족까지 머무름, STATE/STATE_NAGARI는 시퀀스 종료.
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
                return;
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

            // 콜백이 시퀀스를 통째로 교체하지 않았을 때만 진행.
            if (engine.sequencing === prevSeq) {
                BattleSequencer.advance(engine);
            }
        },
        STATE_NAGARI: function (engine) {
            engine.currentState = engine.STATE_NAGARI;
            engine.calculateTenpaiDamage(true);
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
            // 미지의 스텝 타입은 시퀀스를 영영 멈추므로 경고하고 건너뛴다.
            console.warn(`Unknown sequence step type: ${step.type}`);
            BattleSequencer.advance(engine);
        }
    }
};
