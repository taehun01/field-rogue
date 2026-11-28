Scope: $ARGUMENTS (if empty, don't run the whole "한 판의 흐름" — ask me to pick a short scope first)

Before starting, keep it cheap:
- If scope is empty, suggest 2–3 short scopes (e.g. 오프닝, 던전 하나, 마을 한 곳과 의뢰 하나) and wait for my pick.
- If the question is about numbers (death rate, gold, level curve), say `npm run sim` answers it better and ask whether to run that instead.
- If I just want to judge fun on the real build, suggest I play it myself and give you notes; you then only write the record.
- Read only what the scope needs: docs/pitch.md, the relevant sections of docs/game.md, and the relevant files in docs/world/.

Then act as game master and run me through the scope by those rules.

Rules:
- World and tone follow docs/world/. Keep narration short and plain (2–4 lines per scene). All in-game text in Korean.
- Each scene, show state in one line (체력·기력·마력, level, gold, carry weight, active quests; gear only when it changes) and give numbered choices.
- If something isn't defined in the docs (numbers, enemies, items, events), make it up on the spot and mark it [임시].
- Don't advance until I choose.
- After about 20 scenes, stop and ask whether to continue or wrap up.
- Stop when I say "종료".

After stopping:
1. Save a record in playtests/ following playtests/README.md.
2. List what was made up as [임시] and ask whether to move it into the official docs.
Answer in Korean.
