import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { ModelItem } from '../../../data/model';
import { MaquetaService } from '../../../../services/maqueta.service';
import { Product } from '../../../../models/product.model';

@Component({
  selector: 'app-buscador-inteligente',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './buscador-inteligente.html',
  styleUrls: ['./buscador-inteligente.css'],
})
export class BuscadorInteligente implements OnInit, OnDestroy {

  @Output() requestAccess = new EventEmitter<'personalizar'>();
  @Output() modelSelected = new EventEmitter<ModelItem>();

  private readonly maquetaService = inject(MaquetaService);

  searchTerm = '';
  resultados: ModelItem[] = [];
  cargando = false;

  // Listas de categorías cargadas dinámicamente desde el endpoint de productos de la base de datos
  todasCategorias: string[] = [];
  categoriasFiltradas: string[] = [];

  // Subject que emite cada vez que el usuario escribe
  private readonly busqueda$ = new Subject<string>();

  // Suscripción declarada directamente
  private readonly sub = this.busqueda$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(termino => {
      const limpio = termino.trim();
      if (!limpio) {
        this.resultados = [];
        this.categoriasFiltradas = [];
        this.cargando = false;
        return of({
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: 0,
          number: 0,
          first: true,
          last: true,
          empty: true
        });
      }
      this.cargando = true;

      // Buscar productos en el backend
      return this.maquetaService.getProducts(undefined, limpio, 0, 15);
    })
  ).subscribe({
    next: (response) => {
      this.resultados = response.content.map(p => this.mapearProducto(p));
      this.cargando = false;
    },
    error: () => {
      this.resultados = [];
      this.cargando = false;
    }
  });

  ngOnInit(): void {
    // Consultamos las maquetas del backend para extraer dinámicamente las categorías insertadas en la BD
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

  // Realiza el filtrado síncrono local de categorías de forma instantánea al escribir
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

  buscar(): void {
    this.filtrarCategoriasLocal(this.searchTerm);
    this.busqueda$.next(this.searchTerm);
  }

  abrirDetalle(item: ModelItem): void {
    this.modelSelected.emit(item);
  }

  buscarPorCategoria(categoria: string): void {
    this.searchTerm = categoria;
    this.filtrarCategoriasLocal(categoria);
    this.busqueda$.next(categoria);
  }

  limpiarBusqueda(): void {
    this.searchTerm = '';
    this.resultados = [];
    this.categoriasFiltradas = [];
    this.cargando = false;
  }

  setBusqueda(texto: string): void {
    this.searchTerm = texto;
    this.filtrarCategoriasLocal(texto);
    this.busqueda$.next(texto);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private mapearProducto(p: Product): ModelItem {
    let mappedCategory: any = 'Educativo';
    const rawCat = (p.categoriaId || p.categoriaNombre || '').toLowerCase();
    if (rawCat.includes('cien')) {
      mappedCategory = 'Ciencia';
    } else if (rawCat.includes('arq')) {
      mappedCategory = 'Arquitectura';
    } else if (rawCat.includes('incl')) {
      mappedCategory = 'Inclusivo';
    }

    return {
      id: p.id,
      title: p.titulo,
      category: mappedCategory,
      level: p.gradoEscolar || 'Escolar',
      imageUrl: p.imageUrl || 'https://via.placeholder.com/400x300?text=' + encodeURIComponent(p.titulo),
      description: p.descripcion || '',
      materials: p.materiales || [],
      features: (p.caracteristicas && p.caracteristicas.length > 0)
        ? p.caracteristicas
        : [
            'Elaborado con materiales sostenibles',
            p.materialesReciclables ? 'Contiene materiales reciclables' : 'Diseno educativo y didactico',
            'Durabilidad garantizada',
            'Hecho a mano con atencion al detalle'
          ],
      rawProduct: p
    };
  }

}