## *** Sistema de Gestión de Stock de Planta de Reciclaje ***

## Entidades: “Material” Tiene:
•	Nombre (único)

•	Cantidad en stock (siempre ≥ 0)

•	Unidad de medida (unidad, kg, m³)

•	Tipo de material (batería, sólido, fluido- implícito según unidad)

## Casos de uso:
1 - Ver stock Muestra la lista completa de materiales con nombre, cantidad y unidad. 

2 - Registrar compra Se selecciona un material, se ingresa una cantidad positiva y se suma al stock.

3 - Registrar venta Se selecciona un material, se ingresa una cantidad positiva y se resta del stock. Con validación para que no resulte en stock negativo.

4 -Agregar material Permite incorporar un nuevo material al sistema (nombre, unidad de medida). Validar que no esté duplicado.

5 - Eliminar material Permite dar de baja un material que ya no pertenezca al sistema.

## Reglas de negocio:
1 - Stock nunca puede ser negativo < 0

2 - Cantidades en operaciones deben ser positivas 

3 - Nombre de material debe ser unico (Unique)

4 - Unidad de medida según tipo: baterías x unidad (int), sólidos x kg (real), fluidos x m³ (real)

## NO se va a desarrollar:
•	Historial de transacciones 

•	Gestión de proveedores o clientes 

•	Precios 

•	Autenticación / usuarios

•	Reportes

## Tecnología a utilizar:
•	Frontend: HTML + CSS + JS 

•	Backend: Node.js + Express

•	Base de datos: SQLite 

## SECUENCIA:

** Navegador → GET /api/materiales → Express → SQLite → JSON con lista de materiales
                                                          

** Usuario registra ingreso →  PATCH /api/materiales/:id/ingreso  { cantidad: X }

                                valida X > 0
                                
                             ←  200 OK con material actualizado

** Usuario registra egreso →  PATCH /api/materiales/:id/egreso  { cantidad: X }

                              valida X > 0 && stock - X >= 0
                              
                            ←  200 OK  /  400 Error "Stock insuficiente"


## Endpoint - Validaciones

(Obtener datos) *GET /materiales en stock

(Crear datos) *POST /materiales nombre no vacío, unidad válida, nombre no duplicado

(Modif. datos) *PATCH /ingresocantidad > 0, numérica, entera si unidad = unidad

( "      "   ) *PATCH /egresocantidad > 0, numérica, entera si unidad = unidad, stock resultante ≥ 0

(Borrar datos) *DELETE /materiales/:idmaterial debe existir



### Instalacion y ejecución

# 1
cd backend

npm install

# 2
node server.js
