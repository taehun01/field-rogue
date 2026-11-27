import { createRng, randomSeed } from "./core/rng";

// 0단계: 빈 화면. 1단계에서 장면-선택지 루프로 바뀐다.
const app = document.querySelector<HTMLDivElement>("#app")!;
const seed = randomSeed();
const rng = createRng(seed);

app.innerHTML = `
  <h1 class="title">field-rogue</h1>
  <p class="dim">0단계 뼈대. 시드 ${seed}, 첫 난수 ${rng.int(1, 100)}</p>
`;
