# Refactory de v4 > ahora v5

## Clases de excepción 
```js
class SpecificationError  extends Error {} // 400
class UnauthorizedError   extends Error {} // 401
class DomainError         extends Error {} // 422
class ProgramError        extends Error {} // 500
```
Heredan de `Error` que es una lase nativa de javacript que representa un error y se puede instanciar para personalizar diferentes casos

## RPCWebAPIFetch con switch
- Ahora en lugar de retornar `{ ok, data }`, el case 200 retorna el data directamente y todos los demás casos lanzan la excepción correspondiente con el mensaje del servidor `(data.detail)`. 
- El catch interno deja pasar las excepciones y convierte cualquier error inesperado en `"Ha ocurrido un error inesperado."`.

## Funciones actualizadas con instanceof
- registrar, hacerLogin, hacerLogout y llamar ya no usan `if (ok) / else` 
- Ahora el flujo está en el try y cada catch distingue el tipo de error con `instanceof` para mostrar un mensaje según el contexto de cada función.

`instanceof` es un operador de JavaScript que permite comprobar  si un objeto es una instancia de una clase específica
