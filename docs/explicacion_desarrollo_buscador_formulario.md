# 📖 Explicación del Buscador Inteligente y Formulario Centrado (Modo Junior)

Esta guía detalla, paso a paso y línea por línea, cómo funciona la implementación del buscador inteligente dinámico de maquetas y la visualización centrada del formulario de personalización.

---

## 📂 Archivo 1: `buscador-inteligente.ts` (Lógica del Componente)
Este archivo se encarga de la lógica y la conexión con los datos.

### 1. Las Importaciones (Imports)
```typescript
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
```
* **`CommonModule` y `FormsModule`**: Necesarios para que la plantilla de Angular entienda directivas como `*ngIf`, `*ngFor` y el enlace de datos bidireccional `[(ngModel)]`.
* **`EventEmitter` y `Output`**: Permiten enviar eventos hacia el componente padre (`inicio.ts`) para notificar cuando se selecciona un producto o se abre el formulario independiente.
* **`inject`**: Es la nueva forma en Angular para inyectar servicios en componentes sin necesidad de usar constructores pesados.
* **`Subject`**: Una clase de RxJS utilizada como canal para recibir y transmitir las pulsaciones del teclado del usuario en tiempo real.
* **`debounceTime(300)`**: Espera 300 milisegundos tras la última pulsación de tecla antes de disparar la búsqueda. Evita enviar 10 consultas al servidor si el usuario escribe rápido.
* **`distinctUntilChanged()`**: Evita realizar consultas duplicadas si el término de búsqueda actual es exactamente el mismo que el anterior.
* **`switchMap()`**: Cancela automáticamente la petición HTTP de búsqueda anterior si el usuario introduce nuevos caracteres, manteniendo solo la petición activa más reciente.

---

### 2. OnInit y Extracción Dinámica de la Base de Datos
```typescript
ngOnInit(): void {
  this.maquetaService.getProducts(undefined, undefined, 0, 100).subscribe({
    next: (response) => {
      const catsSet = new Set<string>();
      response.content.forEach(p => {
        if (p.categoriaNombre) {
          catsSet.add(p.categoriaNombre);
        }
      });
      this.todasCategorias = Array.from(catsSet);
    },
    error: () => {
      this.todasCategorias = ['Ciencia', 'Arquitectura', 'Educativo', 'Inclusivo']; // Fallback
    }
  });
}
```
* **`Set<string>`**: Es una estructura de JavaScript que **no permite elementos duplicados**. 
* Al inicializar el componente, traemos los primeros 100 productos del servidor. Recorremos cada producto (`response.content.forEach`) y añadimos su categoría (`p.categoriaNombre`) al Set. De esta forma, si hay 50 productos de *"Arquitectura"*, la palabra *"Arquitectura"* se añade una sola vez.
* **`Array.from(catsSet)`**: Convertimos el Set de nuevo en un array limpio de strings para poder filtrarlo en la pantalla.
* **`error`**: Si el backend falla o está apagado, le definimos una lista de categorías base por defecto para que el buscador funcione de todos modos.

---

### 3. Filtrado Local e Instantáneo
```typescript
private filtrarCategoriasLocal(termino: string): void {
  const limpio = termino.trim().toLowerCase();
  if (limpio) {
    this.categoriasFiltradas = this.todasCategorias.filter(cat =>
      cat.toLowerCase().includes(limpio)
    );
  } else {
    this.categoriasFiltradas = [];
  }
}
```
* **`toLowerCase()`**: Convertimos todo el texto a minúsculas para que la búsqueda no falle si se escriben mayúsculas.
* **`includes(limpio)`**: Verifica si el término escrito por el usuario está contenido dentro del nombre de la categoría (por ejemplo, al escribir *"arqui"*, coincidirá con *"Arquitectura"*).
* **¿Por qué local?** Porque al ejecutarse en memoria con la lista precargada, el filtrado es instantáneo y las categorías no desaparecen si la llamada HTTP del backend tarda un poco más en retornar los productos.

---

## 📂 Archivo 2: `buscador-inteligente.html` (Plantilla HTML)
```html
<!-- CATEGORIAS DINAMICAS DEL BACKEND -->
<button
  class="search-item category-item"
  *ngFor="let cat of categoriasFiltradas"
  type="button"
  (click)="buscarPorCategoria(cat)">
  <div class="item-left">
    <div class="item-icon">
      <span class="material-icons">category</span>
    </div>
    <div class="item-content">
      <h4>{{ cat }}</h4>
      <p>Ver todas las maquetas de esta categoría</p>
    </div>
  </div>
  <span class="material-icons item-arrow">arrow_forward</span>
</button>
```
* **`*ngFor="let cat of categoriasFiltradas"`**: Renderiza dinámicamente un botón por cada categoría que coincida con la búsqueda.
* **`{{ cat }}`**: Pinta de manera limpia el nombre de la categoría (ej: *"Inclusivo"*, *"Ciencia"*).

---

## 📂 Archivo 3: `buscador-inteligente.css` (Estilos)
```css
.category-item,
.product-item {
  width: 100%;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
}
```
* **`border: none; background: none;`**: Remueve la decoración de botón gris tradicional del navegador.
* **`text-align: left;`**: Corrige el descuadre visual alineando los textos y el icono hacia la izquierda.

---

## 📂 Archivo 4: `request-form.component.html` (Formulario de Pedidos)
```html
<section class="request-page" [class.standalone-layout]="standaloneRequest">
  <div class="preview-column" *ngIf="!standaloneRequest">
    <figure class="model-preview">
      <img [src]="model.imageUrl" [alt]="model.title">
      <figcaption>{{ model.category }}</figcaption>
    </figure>
  </div>
```
* **`[class.standalone-layout]="standaloneRequest"`**: Añade condicionalmente la clase `.standalone-layout` al contenedor principal si el formulario se abrió de forma directa (desde el Inicio o el Buscador).
* **`*ngIf="!standaloneRequest"`**: Si es una solicitud independiente (`standaloneRequest` es `true`), se oculta la columna izquierda de la imagen previa del catálogo.

---

## 📂 Archivo 5: `request-form.component.css` (Estilos del Formulario Centrado)
```css
.request-page.standalone-layout {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px 70px;
}

.request-page.standalone-layout .form-column {
  width: 100%;
  max-width: 600px;
}
```
* **`display: flex; justify-content: center; align-items: center;`**: Distribuye el formulario como un bloque flexible y lo alinea perfectamente en el centro geométrico de la pantalla.
* **`max-width: 600px;`**: Limita el ancho horizontal del formulario en monitores de escritorio grandes, manteniendo un diseño centrado, elegante y muy limpio.
