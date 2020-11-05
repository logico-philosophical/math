# /test

`nyc`와 `mocha` 실행하기:

```
npm test
```

그러나 `nyc`는 error stack의 줄 번호가 맞지 않는 문제가 알려져 있다(https://github.com/istanbuljs/nyc/issues/619). 줄 번호가 필요하다면

```
npx mocha
```

를 실행하라. `mocha`도 안 맞는 것 같기는 하다.