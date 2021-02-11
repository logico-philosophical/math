# /src/nodes

## 타입 클래스 간의 상속 관계

<table>
	<tr><td colspan="4" align="center"><code>Type</code></td></tr>
	<tr><td rowspan="2"><code>TeeType</code></td><td rowspan="2"><code>FunctionalMetaType</code></td><td colspan="2" align="center"><code>ObjectType</code></td></tr>
	<tr><td><code>SimpleObjectType</code></td><td><code>FunctionalObjectType</code></td></tr>
</table>

`(cls x) => p`의 타입과 같은 함수형 타입이 `FunctionalMetaType` 및 `FunctionalObjectType` 중 무엇이 되는지는 코드 상의 문맥에 따라 달라지며 `FunctionalMetaType`이 된 것과 `FunctionalObjectType`이 된 것은 `Type#equals(Type)`으로 비교하면 같다.