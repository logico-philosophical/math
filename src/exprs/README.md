# /src/exprs

```
Metaexpr
 ├ Reduction
 ├ Tee
 ├ $Variable
 ├ With
 └ Expr0
    ├ Fun
    │  ├ ObjectFun
    │  └ Schema
    ├ Funcall
    └ Variable
       └ Parameter
```

## types.ts

```
Type
 ├ TeeType
 ├ FunctionalMetaType
 └ ObjectType
    ├ SimpleObjectType
    └ FunctionalObjectType
```

`(cls x) => p`와 같은 함수형 표현식의 타입이 `FunctionalMetaType` 및 `FunctionalObjectType` 중 무엇이 되는지는 코드 상의 문맥에 따라 달라지며 `FunctionalMetaType`이 된 것과 `FunctionalObjectType`이 된 것은 `Type#equals(Type)`으로 비교하면 같다.

또 이름을 가질 수 있는 타입은 `SimpleObjectType` 뿐이며 이것이 매크로로 정의되었을 경우 함수형 타입과 `Type#equals(Type)`으로 비교하였을 때 같아질 수 있다. 예를 들어 `SimpleObjectType`인 `pr := [cls -> st]`는 `FunctionalMetaType` 또는 `FunctionalObjectType`인 `[cls -> st]`와 같다.
