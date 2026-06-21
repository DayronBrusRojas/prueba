import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PurchaseRequestService } from '../../../../services/purchase-request.service';
import { MaterialPresupuestoDTO, MaterialSolicitadoDTO } from '../../../../models/purchase-request.model';

interface MaterialItem {
  id: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  esDelProducto: boolean;
  esSolicitado: boolean;
}

interface MaterialSolicitado {
  materialId?: string;
  nombre: string;
  unidad?: string;
  costoVenta?: number;
  agregado: boolean;
}

@Component({
  selector: 'app-presupuestos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './presupuestos.component.html',
  styleUrl: './presupuestos.component.css'
})
export class PresupuestosComponent implements OnChanges {
  
  @Input() solicitudId: string | null = null;
  
  private readonly requestService = inject(PurchaseRequestService);
  
  nombreProyecto = '';
  descripcion = '';
  isCustom = false;
  clienteNombre = '';
  isLoading = false;
  
  materialSeleccionado = '';
  cantidadMaterial = 1;
  
  materialesAgregados: MaterialItem[] = [];
  
  // Client's requested materials
  materialesSolicitados: MaterialSolicitado[] = [];
  materialesDeseados = '';
  
  manoDeObra = 0;
  margenGanancia = 30;
  
  requiereAdelanto = false;
  porcentajeAdelanto = 50;
  
  // Servicio de explicación
  solicitarExplicacion = false;
  tipoEvento = '';
  cantidadPersonas = 0;
  duracionExplicacion = 60;
  precioExplicacion = 0;

  materialesDisponibles = [
    { nombre: 'Madera MDF 3mm', precio: 5.00 },
    { nombre: 'Madera MDF 6mm', precio: 8.00 },
    { nombre: 'Cartón Corrugado', precio: 3.00 },
    { nombre: 'Pintura Acrílica', precio: 12.00 },
    { nombre: 'Pegamento PVA', precio: 6.00 },
    { nombre: 'Alambre Galvanizado', precio: 4.00 },
    { nombre: 'Papel Kraft', precio: 2.50 },
    { nombre: 'Silicona Líquida', precio: 8.00 },
    { nombre: 'Foam Board', precio: 15.00 },
    { nombre: 'Palitos de Madera', precio: 3.50 }
  ];

  private nextId = 1;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['solicitudId'] && this.solicitudId) {
      this.loadSolicitudData(this.solicitudId);
    }
  }

  loadSolicitudData(id: string): void {
    this.isLoading = true;
    console.log('Loading solicitud data for ID:', id);
    this.requestService.obtenerParaPresupuesto(id).subscribe({
      next: (data) => {
        console.log('Solicitud data received:', data);
        console.log('materialesPreferidos:', data.materialesPreferidos);
        console.log('materialesDeseados:', data.materialesDeseados);
        console.log('solicitarExplicacion:', data.solicitarExplicacion);
        console.log('tipoEvento:', data.tipoEvento);
        console.log('cantidadPersonas:', data.cantidadPersonas);
        
        this.nombreProyecto = `${data.productoNombre} - Cliente ${data.clienteNombre}`;
        this.descripcion = data.descripcionPersonalizacion || '';
        this.isCustom = data.isCustom;
        this.clienteNombre = data.clienteNombre;
        
        // Load product materials
        this.materialesAgregados = data.materialesProducto.map((mat, index) => ({
          id: index + 1,
          nombre: mat.nombre,
          cantidad: Number(mat.cantidadSugerida) || 1,
          precioUnitario: Number(mat.costoVenta) || 0,
          esDelProducto: true,
          esSolicitado: false
        }));
        this.nextId = this.materialesAgregados.length + 1;
        
        // Load client's requested materials (selected from list)
        this.materialesSolicitados = (data.materialesPreferidos || []).map(mat => ({
          materialId: mat.materialId,
          nombre: mat.nombre,
          unidad: mat.unidad,
          costoVenta: mat.costoVenta ? Number(mat.costoVenta) : undefined,
          agregado: false
        }));
        console.log('materialesSolicitados loaded:', this.materialesSolicitados);
        
        // Load client's desired materials (free text)
        this.materialesDeseados = data.materialesDeseados || '';
        console.log('materialesDeseados loaded:', this.materialesDeseados);
        
        // Load servicio de explicación data
        this.solicitarExplicacion = data.solicitarExplicacion || false;
        this.tipoEvento = data.tipoEvento || '';
        this.cantidadPersonas = data.cantidadPersonas || 0;
        console.log('solicitarExplicacion loaded:', this.solicitarExplicacion);
        
        // If custom, require advance payment by default
        if (data.isCustom) {
          this.requiereAdelanto = true;
        }
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading solicitud data:', err);
        this.isLoading = false;
      }
    });
  }

  get totalMateriales(): number {
    return this.materialesAgregados.reduce((sum, m) => sum + (m.cantidad * m.precioUnitario), 0);
  }

  get subtotal(): number {
    return this.totalMateriales + this.manoDeObra + this.precioExplicacion;
  }

  get ganancia(): number {
    return this.subtotal * (this.margenGanancia / 100);
  }

  get total(): number {
    return this.subtotal + this.ganancia;
  }

  get explicacionLabel(): string {
    if (!this.solicitarExplicacion) return '';
    return `Precio por ${this.duracionExplicacion} min para ${this.cantidadPersonas} personas`;
  }

  get montoAdelanto(): number {
    if (!this.requiereAdelanto) return 0;
    return this.total * (this.porcentajeAdelanto / 100);
  }

  agregarMaterial(): void {
    if (!this.materialSeleccionado) return;
    
    const material = this.materialesDisponibles.find(m => m.nombre === this.materialSeleccionado);
    if (!material) return;

    const existente = this.materialesAgregados.find(m => m.nombre === this.materialSeleccionado && !m.esDelProducto);
    if (existente) {
      existente.cantidad += this.cantidadMaterial;
    } else {
      this.materialesAgregados.push({
        id: this.nextId++,
        nombre: material.nombre,
        cantidad: this.cantidadMaterial,
        precioUnitario: material.precio,
        esDelProducto: false,
        esSolicitado: false
      });
    }

    this.materialSeleccionado = '';
    this.cantidadMaterial = 1;
  }

  eliminarMaterial(id: number): void {
    const material = this.materialesAgregados.find(m => m.id === id);
    if (material?.esSolicitado) {
      // Mark as not added in the solicited list
      const solicitado = this.materialesSolicitados.find(s => s.nombre === material.nombre);
      if (solicitado) {
        solicitado.agregado = false;
      }
    }
    this.materialesAgregados = this.materialesAgregados.filter(m => m.id !== id);
  }

  agregarMaterialSolicitado(mat: MaterialSolicitado): void {
    if (mat.agregado) return;
    
    // Check if material has price from inventory
    if (mat.costoVenta) {
      this.materialesAgregados.push({
        id: this.nextId++,
        nombre: mat.nombre,
        cantidad: 1,
        precioUnitario: mat.costoVenta,
        esDelProducto: false,
        esSolicitado: true
      });
      mat.agregado = true;
    } else {
      // Material not in inventory, add with 0 price (vendor needs to set it)
      this.materialesAgregados.push({
        id: this.nextId++,
        nombre: mat.nombre,
        cantidad: 1,
        precioUnitario: 0,
        esDelProducto: false,
        esSolicitado: true
      });
      mat.agregado = true;
    }
  }

  nuevoPresupuesto(): void {
    this.nombreProyecto = '';
    this.descripcion = '';
    this.materialesAgregados = [];
    this.materialesSolicitados = [];
    this.materialesDeseados = '';
    this.manoDeObra = 0;
    this.margenGanancia = 30;
    this.requiereAdelanto = false;
    this.porcentajeAdelanto = 50;
    this.isCustom = false;
    this.solicitarExplicacion = false;
    this.tipoEvento = '';
    this.cantidadPersonas = 0;
    this.duracionExplicacion = 60;
    this.precioExplicacion = 0;
  }

  guardarPresupuesto(): void {
    console.log('Guardando presupuesto:', {
      nombreProyecto: this.nombreProyecto,
      descripcion: this.descripcion,
      materiales: this.materialesAgregados,
      manoDeObra: this.manoDeObra,
      margenGanancia: this.margenGanancia,
      requiereAdelanto: this.requiereAdelanto,
      porcentajeAdelanto: this.porcentajeAdelanto,
      total: this.total,
      adelanto: this.montoAdelanto
    });
  }
}
