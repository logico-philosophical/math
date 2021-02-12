# math-o-matic에 기여하기

## Pull request 열기

### 개발 환경 구축하기

먼저 git과 node.js를 설치한 뒤 터미널에 다음을 입력하세요.

```shell
git clone https://github.com/logico-philosophical/math-o-matic.git
cd math-o-matic
npm install
npm run build
```

빌드가 성공했다면 `/dist`에 `math.min.js` 및 `math.min.js.map`이 생성됩니다.

### Pull request를 열기 전에

* `/web/index.html`이 제대로 작동하는지 확인하세요.
* 터미널에 `npm test`를 입력하여 테스트가 통과하는지 확인하세요.

### `/math`에 있는 공리계에 기여하기

#### 정의 및 공리

정의와 공리는 공리계의 생김새를 결정하며 이후에 수많은 정리들이 의존하게 되는 중요한 요소입니다. 그러므로 정의와 공리를 기여할 때는 그것들이 공리계에 미칠 영향에 관해 잘 생각하여 간단하고 아름다운 표현을 사용하세요. 이는 이후 정리들을 증명할 때의 ***고통*** 을 덜어 줍니다.

#### 정리

정리는 증명 여부가 math-o-matic에 의해 기계적으로 확인될 수 있으므로, 정의나 공리보다 대충 작성해도 됩니다. 그러나 math-o-matic은 이해 가능한 증명을 목표로 하고 있으므로, 보다 간단한 증명을 작성하도록 노력하세요. 그 편이 정리를 증명할 때의 ***고통*** 역시 적을 것입니다.

##### *Formalizing 100 Theorems*

무엇을 증명해야 할지 모르겠다면 [*Formalizing 100 Theorems*](https://www.cs.ru.nl/~freek/100/) 페이지에서 골라 보세요. 현재 공리계 상에서 도전해 볼 만한 정리는 다음과 같습니다.

* ?

이미 증명된 정리는 다음과 같습니다. 먼저 증명된 것이 더 위쪽에 작성됩니다.

* 74\. The principle of mathematical induction (`induce`)
* 63\. Cantor's theorem (`cantor`)
* 25\. Schröder–Bernstein theorem (`schroeder_bernstein`)
