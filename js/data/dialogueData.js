const DialogueData = {
    // ----------------------------------------------------------------
    // 1. Encounter Dialogues (Pre-Battle)
    // ----------------------------------------------------------------

    // Ataho vs Rinxiang
    "ataho_rinxiang": [
        { speaker: "rinxiang", text: "앗, 여기에 있었군요...", speakerState: '', listenerState: '' },
        { speaker: "ataho", text: "자....자네는 린샹.", speakerState: '', listenerState: '' },
        { speaker: "rinxiang", text: "아타호...\n당신을 계속 찾고있었다구요.", speakerState: '', listenerState: '' },
        { speaker: "rinxiang", text: "오늘에야말로, 나랑 함께해줘야겠어요!", speakerState: '', listenerState: '' },
        { speaker: "ataho", text: "그...그건 말이지...\n그게\n그런 얘길, 갑자기 들어도...", speakerState: 'shocked', listenerState: '' },
        { speaker: "rinxiang", text: "이젠 애가 탄다구요.", speakerState: 'shocked', listenerState: 'shocked' },
        { speaker: "rinxiang", text: "좋아, 알았어요.\n그러면, 이렇게 하는 건 어때요?", listenerState: 'shocked', speakerState: '' },
        { speaker: "ataho", text: "뭐... 뭔가?", speakerState: '', listenerState: '' },
        { speaker: "rinxiang", text: "내가 이기면, \n당신이 나랑 함께하는 거고.", speakerState: '', listenerState: '' },
        { speaker: "rinxiang", text: "당신이 이기면, \n내가 당신과 함께하는 거에요.", speakerState: '', listenerState: '' },
        { speaker: "ataho", text: "그... 그래선\n전혀 달라진 게 없는 느낌인데...", speakerState: 'shocked', listenerState: '' },
        { speaker: "rinxiang", text: "알아들었죠?\n그럼, 승부에요!", speakerState: 'smile', listenerState: 'shocked' }
    ],

    // Ataho vs Fari
    "ataho_fari": [
        { speaker: "ataho", text: "어라, 화린님 아니신가?\n자네도 참가했던 겐가?", speakerState: '', listenerState: '' },
        { speaker: "fari", text: "아니요, 저는 이쪽이 너무나도 시끌벅적하기에 \n아무 생각 없이 들렀더니,\n어느샌가 참가하는 게 되어 버려서...", speakerState: '', listenerState: '' },
        { speaker: "ataho", text: "나도 비슷한 상황이라구.", speakerState: '', listenerState: '' },
        { speaker: "ataho", text: "대회가 열린다고 하길래 실력 확인차 나가볼까...\n싶어서 출장해보니, 웬걸 게임 대회였지 뭔가.\n이제 와서 참가를 취소하는 것도 폐만 끼칠 뿐이니...", speakerState: '', listenerState: '' },
        { speaker: "fari", text: "그렇네요.\n다른 분께 폐를 끼칠 수는 없으니...", speakerState: 'shocked', listenerState: '' },
        { speaker: "ataho", text: "그러면, 슬슬 시작해볼까나.", speakerState: '', listenerState: '' }
    ],

    // Ataho vs Petum
    "ataho_petum": [
        { speaker: "petum", text: "어라, 아타호씨 아니십니까?\n어때요? 다음에 또 한 잔 하러 가실까요?", speakerState: 'smile', listenerState: '' },
        { speaker: "ataho", text: "아니, 그만 두지.\n자네랑 마시면 좋을게 하나도 없으니 말야.", speakerState: 'shocked', listenerState: '' },
        { speaker: "petum", text: "싫으신 모양이군요.\n얼마 전의 일, 아직도 화가 나신 건가요?", listenerState: 'shocked', speakerState: '' },
        { speaker: "ataho", text: "당연하잖아.", speakerState: 'shocked', listenerState: '' },
        { speaker: "ataho", text: "그렇게나 마셨으면서,\n자기는 \"깜박한 일이 있었다\" 며 돌아가버려 놓곤...", speakerState: 'shocked', listenerState: '' },
        { speaker: "ataho", text: "자네가 살 예정이었으면서,\n결국 내가 전부 계산해 버렸지 않은가.", speakerState: 'shocked', listenerState: '' },
        { speaker: "petum", text: "뭐, 그렇게 화내지 마세요.", listenerState: 'shocked', speakerState: '' },
        { speaker: "petum", text: "너무 화내면 머리의 결함...\n아니, 혈관이 터져버린다구요?\n이제 무리하면 안되는 나이기도 하시니...", listenerState: 'shocked', speakerState: '' },
        { speaker: "ataho", text: "생긴 것보다 나이 먹은 자네에겐 듣고 싶지 않네!!", listenerState: 'shocked', speakerState: '' }
    ],

    // Ataho vs Smash
    "ataho_smash": [
        { speaker: "smash", text: "여, 아저씨.\n이런 곳에서 만나다니 우연이네.\n도대체 어떻게 된거야?", speakerState: 'smile', listenerState: '' },
        { speaker: "ataho", text: "대회가 있다길래 참가했더니,\n무투대회도 많이 마시기 대회도 아니고,\n게임 대회라지 뭔가.", listenerState: 'smile', speakerState: '' },
        { speaker: "smash", text: "뭐~야. 틀림없이 아저씨도 나랑 똑같이\n대회에 우승하고 유명해져서,\n귀여운 걸들을 GET하려고 온 줄 알았다구.", speakerState: 'smile', listenerState: '' },
        { speaker: "ataho", text: "부탁이니 자네와 같은 레벨로 생각하지 말아줬음 하네.", speakerState: 'shocked', listenerState: 'smile' },
        { speaker: "smash", text: "미안하지만 이 몸의 계획을 위해\n아저씨는 여기서 져줘야 겠어.", listenerState: 'shocked', speakerState: '' }
    ],

    // Ataho vs Yuriwakamaru
    "ataho_yuri": [
        { speaker: "ataho", text: "어라, 자네는!", speakerState: 'smile', listenerState: '' },
        { speaker: "yuri", text: "나랑 어디서 만난 적이라도 있었나?", listenerState: 'smile', speakerState: '' },
        { speaker: "ataho", text: "나야, 아타호라고.", speakerState: 'smile', listenerState: '' },
        { speaker: "ataho", text: "있잖아, 그 때의...", speakerState: 'smile', listenerState: '' },
        { speaker: "ataho", text: "그 때...", speakerState: 'smile', listenerState: '' },
        { speaker: "ataho", text: "그", speakerState: '', listenerState: '' },
        { speaker: "ataho", text: "………………………………", speakerState: '', listenerState: '' },
        { speaker: "ataho", text: "그~게.", speakerState: 'shocked', listenerState: '' },
        { speaker: "ataho", text: "그래그래.", speakerState: '', listenerState: '' },
        { speaker: "ataho", text: "뭐였더라.", speakerState: 'shocked', listenerState: '' },
        { speaker: "ataho", text: "어라라.", speakerState: 'shocked', listenerState: '' },
        { speaker: "ataho", text: "음~ 전혀 기억나지 않네!!", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "뭐야, 넌!", listenerState: 'shocked', speakerState: '' }
    ],

    // Rinxiang vs Fari
    "rinxiang_fari": [
        { speaker: "fari", text: "안녕하세요.", speakerState: 'smile', listenerState: '' },
        { speaker: "rinxiang", text: "아...안녕하세요.", listenerState: 'smile', speakerState: '' },
        { speaker: "rinxiang", text: "당신이 혹시 화린씨?", listenerState: 'smile', speakerState: '' },
        { speaker: "fari", text: "그렇습니다만, 어떻게 제 이름을 알고 계신건가요?", speakerState: '', listenerState: '' },
        { speaker: "rinxiang", text: "과연, 아타호가 얘기했던 대로네.\n한 눈에 그런 줄 알았다구요.", speakerState: 'shocked', listenerState: '' },
        { speaker: "fari", text: "네에, 아타호씨랑 아는 사이신가요?", listenerState: 'shocked', speakerState: '' },
        { speaker: "rinxiang", text: "말해두겠지만 아타호는 제 거니까,\n손대거나 하면 용서하지 않을 거에요!", speakerState: 'shocked', listenerState: '' },
        { speaker: "rinxiang", text: "당신에겐 스마슈가 어울려!", speakerState: 'shocked', listenerState: '' },
        { speaker: "fari", text: "뭐... 뭐라구요!\n하필이면 스마슈씨라니...", speakerState: 'shocked', listenerState: 'shocked' },
        { speaker: "fari", text: "세상에는 해도 될 말과 안 될 말이 있다구요!!", speakerState: 'shocked', listenerState: 'shocked' }
    ],

    // Rinxiang vs Petum
    "rinxiang_petum": [
        { speaker: "petum", text: "처음 뵙겠습니다.\n당신이 린샹씨군요?", speakerState: '', listenerState: '' },
        { speaker: "rinxiang", text: "아... 당신은...?", speakerState: '', listenerState: '' },
        { speaker: "petum", text: "앗, 이것 참 소개가 늦었습니다.\n저는 아타호의 친구인\n페톰이라는 사람입니다.", speakerState: 'smile', listenerState: '' },
        { speaker: "petum", text: "당신에 대해서는 아타호에게 많이 들었습니다.", speakerState: '', listenerState: '' },
        { speaker: "rinxiang", text: "!\n그래서 아타호는\n저에 대해서 뭐라고 했어요?", speakerState: '', listenerState: '' },
        { speaker: "petum", text: "대단한 얘기는 안 했지만,\n무척이나 신경쓰고 있는 모습이었어요.", speakerState: '', listenerState: '' },
        { speaker: "rinxiang", text: "그래요, 고마워요.\n그러면, 또.", speakerState: 'smile', listenerState: '' },
        { speaker: "petum", text: "어라, 벌써 가시려는 건가요?\n성격이 급하시네요. ", listenerState: 'smile', speakerState: '' },
        { speaker: "petum", text: "한 번 정도는 같이 어울려 달라구요.", speakerState: '', listenerState: '' }
    ],

    // Rinxiang vs Smash
    "rinxiang_smash": [
        { speaker: "smash", text: "여, 린샹.\n오랜만이네.", speakerState: 'smile', listenerState: '' },
        { speaker: "rinxiang", text: "어머 스마슈잖아, 우연이네.\n여전히 여자애들 꽁무니나 쫓아다니는 거에요?", listenerState: 'smile', speakerState: '' },
        { speaker: "smash", text: "말이 심하구만.", speakerState: '', listenerState: '' },
        { speaker: "rinxiang", text: "뭐 대충, 이 대회에 나온 것도\n출전하는 여자애들이 목적인 거 아냐?", speakerState: 'shocked', listenerState: '' },
        { speaker: "smash", text: "쯧쯧쯧.\n그게 아니라구.\n됐으니까 잘 들어봐.", speakerState: 'smile', listenerState: 'shocked' },
        { speaker: "smash", text: "내가 이 대회에 참가한 진짜 목적은 말야,\n우승하고 유명해져서\nGIRL들한테 인기폭발이 되는 것이지.", speakerState: 'smile', listenerState: 'shocked' },
        { speaker: "smash", text: "여자애들 꽁무니나 쫓아다니기 위해\n참가한 게 아니라구!!", speakerState: 'smile', listenerState: 'shocked' },
        { speaker: "rinxiang", text: "둘 다 마찬가지잖아, 바보.", speakerState: 'shocked', listenerState: 'smile' },
        { speaker: "smash", text: "뭐라구~!!", speakerState: 'shocked', listenerState: 'shocked' }
    ],

    // Rinxiang vs Yuriwakamaru
    "rinxiang_yuri": [
        { speaker: "yuri", text: "거기 여자, 잠깐 기다려!\n너, 분명 린샹이지?", speakerState: '', listenerState: '' },
        { speaker: "rinxiang", text: "누구야, 당신?\n사람 이름을 함부로 부르고...", speakerState: 'shocked', listenerState: '' },
        { speaker: "yuri", text: "너, 요새 좀 인기가 생긴 모양이네.", listenerState: 'shocked', speakerState: '' },
        { speaker: "rinxiang", text: "당신은 설마하니....", speakerState: '', listenerState: '' },
        { speaker: "rinxiang", text: "화려한 걸 좋아하는 방탕아면서 요새 존재감이 없는\n유리와카마루인가요?", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "시... 시끄러워.\n신경쓰고 있는 부분을...", speakerState: 'shocked', listenerState: '' }
    ],

    // Fari vs Petum
    "fari_petum": [
        { speaker: "fari", text: "어머, 페톰씨\n안녕하세요?", speakerState: '', listenerState: '' },
        { speaker: "petum", text: "아, 안녕하세요.", speakerState: '', listenerState: '' },
        { speaker: "fari", text: "이걸로 마지막 시합인거죠?", speakerState: '', listenerState: '' },
        { speaker: "petum", text: "아무래도 그런 거 같네요.", speakerState: '', listenerState: '' },
        { speaker: "fari", text: "이기면 우승이네요.", speakerState: '', listenerState: '' },
        { speaker: "petum", text: "아아 챔피언\n이라고 하는 그거네요.", speakerState: '', listenerState: '' },
        { speaker: "fari", text: "슬슬 시작할까요?", speakerState: '', listenerState: '' },
        { speaker: "petum", text: "그렇네요, 시간이 아까우니까.", speakerState: '', listenerState: '' }
    ],

    // Fari vs Smash
    "fari_smash": [
        { speaker: "smash", text: "이게 누구야, 화린양이잖아.\n만나고 싶었어.", speakerState: '', listenerState: '' },
        { speaker: "fari", text: "어머, 스마슈씨.\n저도 스마슈씨를 만나고 싶었어요.", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "우우...\n화린양, 설마하니\n그렇게까지 날 생각해주고 있던거야?", speakerState: '', listenerState: '' },
        { speaker: "fari", text: "물론이죠, 스마슈씨.\n지난 번에 빌려간 돈 2000G,\n갚아주셨으면 하는데요.", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "그... 그러고보니, 그런 것도 있었었나...", speakerState: '', listenerState: '' },
        { speaker: "fari", text: "있었다구요.\n게다가 이미 기한도 지났다구요.", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "미안해, 화린양!\n지금, 가진 게 없어!!", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "조금만 더... 조금만 더 기다려줘!!", speakerState: '', listenerState: '' },
        { speaker: "fari", text: "어떡할까요...", speakerState: '', listenerState: '' },
        { speaker: "fari", text: "그래요, 나랑 승부해서 이기면,\n조금 더 기다려 드릴게요.", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "역시 화린양.\n말이 통한다니까!!", speakerState: '', listenerState: '' }
    ],

    // Fari vs Yuriwakamaru
    "fari_yuri": [
        { speaker: "fari", text: "안녕하세요.", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "화린이잖아.\n오랜만이네.", speakerState: '', listenerState: '' },
        { speaker: "fari", text: "유리와카마루씨야 말로\n변함없는 모습이네요.\n성에서의 생활은 어떠세요?", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "그게, 실은 그 후에...", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "형님도 돌아오셔서,", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "또 성을 빠져 나왔어.", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "아니, 사실을 말하자면,\n성에서의 생활이랑 여자 옷을 입는게\n갑갑했어서 그런 거지만.", speakerState: '', listenerState: '' },
        { speaker: "fari", text: "뭐, 그런 거였나요.\n그래도 조금 안타깝네요.", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "뭐...뭐가?", speakerState: '', listenerState: '' },
        { speaker: "fari", text: "한 번만이라도 좋으니까,\n유리와카마루씨의 기모노 차림이 보고 싶었는데.", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "어... 어이,\n농담하지 말아줘.\n난 그런 거 입는 거, 두 번 다신 사양이라구.", speakerState: '', listenerState: '' }
    ],

    // Petum vs Smash
    "petum_smash": [
        { speaker: "smash", text: "앗, 페톰이잖아.\n이런 곳에서 만나다니 별일인걸.", speakerState: 'smile', listenerState: '' },
        { speaker: "petum", text: "... 그렇네요.", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "오랜만에 만나지만, 전혀 변함이 없는 것 같네", speakerState: '', listenerState: '' },
        { speaker: "petum", text: "... 그렇네요.", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "키리랑 알리바바는 건강하게 지내려나?", speakerState: '', listenerState: '' },
        { speaker: "petum", text: "... 그렇네요.", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "왠지 아까부터\n\"그렇네요\" 라고만 하잖아.", speakerState: '', listenerState: '' },
        { speaker: "petum", text: "... 그렇네요.", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "페톰, 너 장난하냐!!", speakerState: '', listenerState: '' },
        { speaker: "petum", text: "... 응... 아...\n이런이런 스마슈씨.\n좋은 아침입니다.", speakerState: '', listenerState: '' },
        { speaker: "petum", text: "너무 졸려서, 저도 모르게 선 채로 잠들어버렸네요.", speakerState: '', listenerState: '' },
        { speaker: "petum", text: "그런데 소리를 다 지르시고...\n무슨 일 있었나요?", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "뭐라고~옷!!\n그렇다는 건, 지금까지 네놈의 대답은 전부 잠꼬대였던거냐!!", speakerState: '', listenerState: '' }
    ],

    // Petum vs Yuriwakamaru
    "petum_yuri": [
        { speaker: "petum", text: "여, 안녕하십니까.", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "아... 아, 안녕.", speakerState: '', listenerState: '' },
        { speaker: "petum", text: "처음 뵙겠습니다. 페톰입니다.\n잘 부탁드립니다.", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "아... 나는 유리와카마루.\n이쪽이야말로 잘 부탁해.", speakerState: '', listenerState: '' },
        { speaker: "petum", text: "그럼 시간이 아까우니,\n슬슬 시작해볼까요?", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "그렇네, 그렇게 할까.", speakerState: '', listenerState: '' }
    ],

    // Smash vs Yuriwakamaru
    "smash_yuri": [
        { speaker: "smash", text: "드디어 마지막인가...\n도대체, 어떤 놈이 상대냐?", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "아무렴 어때.\n어떤 녀석이 상대라고 해도, 나는 지지 않아!", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "뭐야. 마지막 상대는 바보 개였던 건가...", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "너는 유리와카마루!", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "헉, 여전히 변태같은 얼굴을 하고 있구만.", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "뭐어라고오~!\n너야말로\n여전히 색기라곤 없구만.", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "그렇게까지 죽음을 재촉하는 건가? 스마슈.", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "흥, 죽음을 재촉하는 건 네놈이 아닌가?\n유리와카마루, 승부다!!", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "바라던 바다.", speakerState: '', listenerState: '' }
    ],

    // Ataho vs Mayu
    "ataho_mayu": [
        { speaker: "ataho", text: "...", speakerState: '', listenerState: '' },
        { speaker: "mayu", text: "쿠웅...", speakerState: '', listenerState: '' }
    ],

    // Rinxiang vs Mayu
    "rinxiang_mayu": [
        { speaker: "rinxiang", text: "...", speakerState: '', listenerState: '' },
        { speaker: "mayu", text: "쿠웅...", speakerState: '', listenerState: '' }
    ],

    // Fari vs Mayu
    "fari_mayu": [
        { speaker: "fari", text: "...", speakerState: '', listenerState: '' },
        { speaker: "mayu", text: "쿠웅...", speakerState: '', listenerState: '' }
    ],

    // Petum vs Mayu
    "petum_mayu": [
        { speaker: "petum", text: "...", speakerState: '', listenerState: '' },
        { speaker: "mayu", text: "쿠웅...", speakerState: '', listenerState: '' }
    ],

    // Smash vs Mayu
    "smash_mayu": [
        { speaker: "smash", text: "...", speakerState: '', listenerState: '' },
        { speaker: "mayu", text: "쿠웅...", speakerState: '', listenerState: '' }
    ],

    // Yuri vs Mayu
    "yuri_mayu": [
        { speaker: "yuri", text: "...", speakerState: '', listenerState: '' },
        { speaker: "mayu", text: "쿠웅...", speakerState: '', listenerState: '' }
    ],

    // ----------------------------------------------------------------
    // 2. Ending Dialogues (Post-Battle)
    // ----------------------------------------------------------------

    // Ataho vs Rinxiang (Ending)
    "ataho_rinxiang_ending": [
        { speaker: "rinxiang", text: "져버렸네... 약속대로,\n제가 당신과 함께하겠어요.", speakerState: '', listenerState: '' },
        { speaker: "ataho", text: "기... 기다려, 린샹.\n자네에게는,\n아직 너무 이르다고 생각됨세만...", speakerState: '', listenerState: '' },
        { speaker: "rinxiang", text: "그렇게 생각하지 마세요.\n저도 이제 어엿한 어른이라구요.", speakerState: '', listenerState: '' },
        { speaker: "ataho", text: "그... 그건 그렇지만...", speakerState: '', listenerState: '' },
        { speaker: "rinxiang", text: "아타호만큼은 못 마시지만,\n함께 어울리는 정도라면 괜찮다구요.", speakerState: '', listenerState: '' },
        { speaker: "ataho", text: "마시는...?\n도대체 무슨 소리를 하는 겐가?", speakerState: '', listenerState: '' },
        { speaker: "rinxiang", text: "뭐냐니...\n오늘은 같이 술을 마셔주겠다는 얘길\n하고 있는 거잖아요.", speakerState: '', listenerState: '' },
        { speaker: "ataho", text: "어이쿠, 술 얘기였던 건가.\n뭐야, 그랬군 그랬군.", speakerState: '', listenerState: '' },
        { speaker: "rinxiang", text: "응? 아타호.\n도대체 무슨 얘기라고 생각했어요?", speakerState: '', listenerState: '' },
        { speaker: "ataho", text: "그... 그게 말이지....\n아무 것도 아니네, 잊어 주게!", speakerState: '', listenerState: '' },
        { speaker: "rinxiang", text: "뭐? 뭐랑 착각했던 거야?\n알려줘요, 아타호!", speakerState: '', listenerState: '' }
    ],

    // Rinxiang vs Ataho (Ending)
    "rinxiang_ataho_ending": [
        { speaker: "rinxiang", text: "약속대로, 나랑 함께해요.\n아타호.", speakerState: 'smile', listenerState: '' },
        { speaker: "ataho", text: "음. 조금 성급한 느낌이긴 하지만.\n약속은 약속이니까.", speakerState: 'shocked', listenerState: 'smile' },
        { speaker: "rinxiang", text: "조금도 성급하지 않거든요.\n게다가...", listenerState: 'shocked', speakerState: '' },
        { speaker: "rinxiang", text: "아타호가 함께 있다면,\n어떤 어려움이 있어도\n극복해낼 수 있을 기분이 드는 걸요.", listenerState: 'shocked', speakerState: '' },
        { speaker: "ataho", text: "그런 말을 들으니, 조금 부끄럽구만.", speakerState: 'smile', listenerState: '' },
        { speaker: "ataho", text: "별 수 없지. 나도 이번 기회로,\n슬슬 자리를 잡을 각오를 가져볼까.", speakerState: '', listenerState: '' },
        { speaker: "rinxiang", text: "자리를 잡다니, 무슨 얘기에요, 아타호.\n혹시, 나랑 무사 수행을 떠나는 게\n그렇게 싫은 거에요?", speakerState: 'shocked', listenerState: '' },
        { speaker: "ataho", text: "무... 무사 수행?!\n뭐야, 무사 수행에\n함께 해달라는 말이었나...", speakerState: 'shocked', listenerState: 'shocked' },
        { speaker: "ataho", text: "난 또 틀림없이...", speakerState: 'shocked', listenerState: 'shocked' },
        { speaker: "rinxiang", text: "틀림없이, 뭘?", listenerState: 'shocked', speakerState: '' },
        { speaker: "ataho", text: "그... 그게 말이지\n아무 것도 아냐, 잊어 주게!", speakerState: 'shocked', listenerState: '' },
        { speaker: "rinxiang", text: "틀림없이 뭘요?\n뭐랑 착각했던 거야?", speakerState: 'smile', listenerState: 'shocked' },
        { speaker: "ataho", text: "그... 그래, 무사 수행 여행을 출발하자고!", listenerState: 'smile', speakerState: '' },
        { speaker: "rinxiang", text: "앗... 기다려, 아타호!", speakerState: '', listenerState: '' }
    ],

    // Fari vs Petum (Ending)
    "fari_petum_ending": [
        { speaker: "fari", text: "그런데 우리들은, 왜 이런 걸 하고 있던 걸까요?", speakerState: '', listenerState: '' },
        { speaker: "petum", text: "글쎄, 모르겠네요.\n대체 왜인 걸까요?", speakerState: '', listenerState: '' },
        { speaker: "fari", text: "맞아맞아, 페톰씨.\n얼마 전에 맛있는 차를 구했어요.\n같이 드셔보시겠어요?", speakerState: '', listenerState: '' },
        { speaker: "petum", text: "그렇군요.\n사양하지 않고 같이 어울려볼까요.", speakerState: '', listenerState: '' },
        { speaker: "petum", text: "그러면 저는\n맛있는 화과자라도 들고 오죠.", speakerState: '', listenerState: '' },
        { speaker: "fari", text: "알겠어요.\n그러면 기다리고 있을게요.", speakerState: '', listenerState: '' }
    ],

    // Petum vs Fari (Ending)
    "petum_fari_ending": [
        { speaker: "fari", text: "그런데 우리들은, 왜 이런 걸 하고 있던 걸까요?", speakerState: '', listenerState: '' },
        { speaker: "petum", text: "글쎄, 모르겠네요.\n대체 왜인 걸까요?", speakerState: '', listenerState: '' },
        { speaker: "fari", text: "맞아맞아, 페톰씨.\n얼마 전에 맛있는 차를 구했어요.\n같이 드셔보시겠어요?", speakerState: '', listenerState: '' },
        { speaker: "petum", text: "그렇군요.\n사양하지 않고 같이 어울려볼까요.", speakerState: '', listenerState: '' },
        { speaker: "petum", text: "그러면 저는\n맛있는 화과자라도 들고 오죠.", speakerState: '', listenerState: '' },
        { speaker: "fari", text: "알겠어요.\n그러면 기다리고 있을게요.", speakerState: '', listenerState: '' }
    ],

    // Smash vs Yuri (Ending)
    "smash_yuri_ending": [
        { speaker: "smash", text: "좋았어, 내가 우승이라구!", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "자, 얼마나 많은 여자애들이 나의 우승을 \n축하해주려나~?", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "어이, 스마슈.\n주변에는 더 이상 아무도 없다고.", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "뭐라~곳!!", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "아...아니\n이 몸의 우승을 축하줄 여자애들이\n분명 어딘가에 숨어있을 거다!", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "어디야? 어디 있는 거야!\n귀여운 GIRL들아!!", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "………………", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "이제, 적당히 포기하는 게 어때?", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "우승해서 여자애들에게 인기폭발이 되려던 계획이...\n기둥서방이 되려던 계획이...", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "어... 어째서...", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "훗, 저런저런...\n여전한 바보로구만...", speakerState: '', listenerState: '' }
    ],

    // Yuri vs Smash (Ending)
    "yuri_smash_ending": [
        { speaker: "smash", text: "젠장... 나의 패배다...", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "………………", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "나도 남자다!\n각오했다고!!", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "자, 유리와카마루.\n승부에 진 이 몸,\n삶든지 굽든지 맘대로 해!!", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "뭐야... 네 놈치곤\n유난히 체념이 빠르지 않나...", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "………라니 뭐라는 거야!\n네 놈 무슨 생각을 하는 거냐!!", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "응? 아닌가?", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "왜냐면 이런 때는 보통,\n진 쪽의 옷을 벗기는 게 정석이잖아.", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "됐・으・니・까!", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "네놈한테 아무 것도 안하니까,\n얼른 옷 입어!!", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "뭐야 너.\n그렇게 내 알몸이 부끄러운 거야?", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "당연하잖아!\n나는 여자라고~!!", speakerState: '', listenerState: '' }
    ],

    // Normal Mayu Endings (Placeholder: Add here if needed for Normal Endings vs Mayu)
    // Currently relying on defaults or empty (removed as per user request), 
    // but if we had them, they would go here.

    // ----------------------------------------------------------------
    // 3. True Ending Dialogues (Post-Battle)
    // ----------------------------------------------------------------

    // Ataho vs Mayu (True Ending)
    "ataho_mayu_true_ending": [
        { speaker: "ataho", text: "어이쿠야, 자네의 정체는 눈썹개였던 건가!\n그러면, 어째서 내게 대결을 청해온겐가?", speakerState: '', listenerState: '' },
        { speaker: "mayu", text: "크~웅...", speakerState: '', listenerState: '' },
        { speaker: "ataho", text: "흠. 무슨 말을 하는 건지 모르겠지만,\n아무튼 이 몸에게 도전한 것은, 조금 무모했던 것 같구먼.", speakerState: '', listenerState: '' }
    ],

    // Rinxiang vs Mayu (True Ending)
    "rinxiang_mayu_true_ending": [
        { speaker: "rinxiang", text: "너는 눈썹개였구나!", speakerState: '', listenerState: '' },
        { speaker: "rinxiang", text: "이 나에게 도전하다니, 10년은 일러. \n더 수행을 쌓고 오라구!", speakerState: '', listenerState: '' },
        { speaker: "mayu", text: "큐~웅...", speakerState: '', listenerState: '' }
    ],

    // Fari vs Mayu (True Ending)
    "fari_mayu_true_ending": [
        { speaker: "fari", text: "당신은... 눈썹개였던 건가요?", speakerState: '', listenerState: '' },
        { speaker: "mayu", text: "큐~웅...", speakerState: '', listenerState: '' },
        { speaker: "fari", text: "당신은 사람을 갑자기 습격하는 것이\n얼마나 잘못된 일인지 알고 있는 건가요!", speakerState: '', listenerState: '' },
        { speaker: "fari", text: "지금부터 그 일에 대해, 차분하게 잔소리해 줄테니\n잘 들으세요. 알겠죠!!", speakerState: '', listenerState: '' },
        { speaker: "mayu", text: "큐~웅...", speakerState: '', listenerState: '' }
    ],

    // Petum vs Mayu (True Ending)
    "petum_mayu_true_ending": [
        { speaker: "petum", text: "어라, 당신은 눈썹개씨였던 겁니까.", speakerState: '', listenerState: '' },
        { speaker: "mayu", text: "쿠웅...", speakerState: '', listenerState: '' },
        { speaker: "petum", text: "그렇군요, 사람을 찾고 있었던 건가요.\n그 사람이라면, 아까 전에 저쪽에 있었답니다.", speakerState: '', listenerState: '' },
        { speaker: "mayu", text: "멍멍", speakerState: '', listenerState: '' },
        { speaker: "petum", text: "아니, 감사는 됐어요.\n그럼 건강히.", speakerState: '', listenerState: '' }
    ],

    // Smash vs Mayu (True Ending)
    "smash_mayu_true_ending": [
        { speaker: "smash", text: "네...네 놈은 눈썹개!!", speakerState: '', listenerState: '' },
        { speaker: "mayu", text: "쿠~웅...", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "잘 지냈어?\n만나고 싶었다고~!", speakerState: '', listenerState: '' },
        { speaker: "mayu", text: "멍머~엉!", speakerState: '', listenerState: '' },
        { speaker: "smash", text: "아우~웅!!", speakerState: '', listenerState: '' }
    ],

    // Yuri vs Mayu (True Ending)
    "yuri_mayu_true_ending": [
        { speaker: "yuri", text: "뭐야 너, 눈썹개였던 건가.\n여전히 웃긴 얼굴이네~", speakerState: '', listenerState: '' },
        { speaker: "mayu", text: "쿠~웅...", speakerState: '', listenerState: '' },
        { speaker: "yuri", text: "좋~아, 재회한 기념으로, 또 낙서나 해줄~까.\n어떤 얼굴로 해줄~까나~?", speakerState: '', listenerState: '' },
        { speaker: "mayu", text: "캬아~앙!!", speakerState: '', listenerState: '' }
    ],

    // ----------------------------------------------------------------
    // 4. Default Fallbacks
    // ----------------------------------------------------------------
    "default": [
        { speaker: 'p1', text: "자, 승부다!", speakerState: '', listenerState: '' },
        { speaker: 'cpu', text: "지지 않아!", speakerState: '', listenerState: '' }
    ]
};
