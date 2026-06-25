import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type PaymentMethod = 'Online' | 'Fisico';
type PaymentKind = 'Abono' | 'Adelanto' | 'Saldo' | 'Total';
type FormMode = 'chat' | 'manual';

interface PaymentForm {
    client: string;
    email: string;
    phone: string;
    productType: string;
    materials: string;
    amount: number | null;
    method: string;
    kind: string;
    date: string;
    operation: string;
    inventory: boolean;
}

interface PendingBalance {
    client: string;
    project: string;
    materials: string;
    method: PaymentMethod;
    amount: number;
    dueDate: string;
}

interface Transaction {
    client: string;
    email: string;
    productType: string;
    materials: string;
    method: PaymentMethod;
    kind: PaymentKind;
    amount: number;
    operation: string;
    date: string;
    status: 'online' | 'fisico';
}

@Component({
    selector: 'app-flujodepagos',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './flujodepagos.component.html',
    styleUrl: './flujodepagos.component.css'
})
export class FlujoDePagosComponent {
    formMode: FormMode = 'chat';
    selectedReceipt: Transaction | null = null;
    exportLabel = 'Exportar CSV';

    private readonly chatPaymentForm: PaymentForm = {
        client: 'Carlos Mendoza Pinedo',
        email: 'carlos.mendoza@gmail.com',
        phone: '987654321',
        productType: 'Proyecto Personalizado (Maqueta a Medida)',
        materials: 'Madera Balsa Premium, PLA translucido, Acrilico 2mm',
        amount: 187.85,
        method: 'Online (Yape / Transferencia)',
        kind: 'Adelanto (50%)',
        date: '2026-06-24T09:38',
        operation: 'YAPE-OPE-938102',
        inventory: true
    };

    paymentForm: PaymentForm = { ...this.chatPaymentForm };

    productTypes = [
        'Proyecto Personalizado (Maqueta a Medida)',
        'Proyecto Predeterminado (Catalogo)'
    ];

    paymentMethods = [
        'Online (Yape / Transferencia)',
        'Fisico (Efectivo en persona)'
    ];

    paymentKinds = [
        'Adelanto (50%)',
        'Saldo Restante (50%)',
        'Pago Completo (100%)'
    ];

    methodFilters = ['Metodo', 'Online', 'Fisico'];
    kindFilters = ['Abono', 'Adelanto', 'Saldo', 'Total'];

    selectedMethodFilter = 'Metodo';
    selectedKindFilter = 'Abono';
    searchTerm = '';

    pendingBalances: PendingBalance[] = [
        {
            client: 'Lucia Fernandez Ramos',
            project: 'Maqueta de Puente Colgante Lineal',
            materials: 'Madera Pino, PLA Gris',
            method: 'Online',
            amount: 250,
            dueDate: 'Hoy'
        },
        {
            client: 'Carlos Mendoza Pinedo',
            project: 'Maqueta de Catedral Colonial a Escala',
            materials: 'Madera Balsa, Acrilico',
            method: 'Fisico',
            amount: 187.85,
            dueDate: 'Manana'
        },
        {
            client: 'Ana Maria Beltran',
            project: 'Kit escolar de energia renovable',
            materials: 'Carton Maqueta Gris, Pintura Acrilica',
            method: 'Fisico',
            amount: 120,
            dueDate: 'Viernes'
        },
        {
            client: 'Mateo Salazar Cueva',
            project: 'Maqueta urbana con iluminacion LED',
            materials: 'Foam, MDF delgado, LEDs',
            method: 'Online',
            amount: 315.5,
            dueDate: '30 Jun'
        }
    ];

    transactions: Transaction[] = [
        {
            client: 'Carlos Mendoza Pinedo',
            email: 'carlos.mendoza.pinedo@gmail.com',
            productType: 'Personalizada',
            materials: 'Madera Balsa Premium, PLA translucido, Acrilico 2mm',
            method: 'Online',
            kind: 'Adelanto',
            amount: 187.85,
            operation: 'YAPE-OPE-938102',
            date: '22 Jun 2026, 20:05',
            status: 'online'
        },
        {
            client: 'Ana Maria Beltran',
            email: 'ana.beltran@gmail.com',
            productType: 'Predeterminada',
            materials: 'Carton Maqueta Gris, Pintura Acrilica',
            method: 'Fisico',
            kind: 'Total',
            amount: 120,
            operation: 'CAJA-REC-0018',
            date: '22 Jun 2026, 18:46',
            status: 'fisico'
        },
        {
            client: 'Lucia Fernandez Ramos',
            email: 'lucia.fernandez@gmail.com',
            productType: 'Personalizada',
            materials: 'Madera Pino, Filamento PLA Verde',
            method: 'Online',
            kind: 'Saldo',
            amount: 250,
            operation: 'TRANSFER-5820',
            date: '21 Jun 2026, 16:22',
            status: 'online'
        }
    ];

    get filteredTransactions(): Transaction[] {
        const query = this.searchTerm.trim().toLowerCase();

        return this.transactions.filter((transaction) => {
            const matchesSearch = !query || transaction.client.toLowerCase().includes(query);
            const matchesMethod = this.selectedMethodFilter === 'Metodo' || transaction.method === this.selectedMethodFilter;
            const matchesKind = this.selectedKindFilter === 'Abono' || transaction.kind === this.selectedKindFilter;

            return matchesSearch && matchesMethod && matchesKind;
        });
    }

    get dailyTotal(): number {
        return this.transactions.reduce((total, transaction) => total + transaction.amount, 0);
    }

    get onlineCount(): number {
        return this.transactions.filter((transaction) => transaction.method === 'Online').length;
    }

    get physicalCount(): number {
        return this.transactions.filter((transaction) => transaction.method === 'Fisico').length;
    }

    openReceipt(transaction: Transaction): void {
        this.selectedReceipt = transaction;
    }

    closeReceipt(): void {
        this.selectedReceipt = null;
    }

    setFormMode(mode: FormMode): void {
        this.formMode = mode;
        this.paymentForm = mode === 'chat'
            ? { ...this.chatPaymentForm }
            : {
                client: '',
                email: '',
                phone: '',
                productType: '',
                materials: '',
                amount: null,
                method: '',
                kind: '',
                date: '',
                operation: '',
                inventory: false
            };
    }

    collectBalance(balance: PendingBalance): void {
        this.formMode = 'chat';
        this.paymentForm.client = balance.client;
        this.paymentForm.materials = balance.materials;
        this.paymentForm.amount = balance.amount;
        this.paymentForm.method = balance.method === 'Online'
            ? 'Online (Yape / Transferencia)'
            : 'Fisico (Efectivo en persona)';
        this.paymentForm.kind = 'Saldo Restante (50%)';
    }

    cancelTransaction(transaction: Transaction): void {
        this.transactions = this.transactions.filter((item) => item !== transaction);
    }

    exportCsv(): void {
        this.exportLabel = 'CSV exportado';

        window.setTimeout(() => {
            this.exportLabel = 'Exportar CSV';
        }, 1200);
    }

    registerTransaction(): void {
        const method: PaymentMethod = this.paymentForm.method.startsWith('Online') ? 'Online' : 'Fisico';
        const kind: PaymentKind = this.paymentForm.kind.startsWith('Pago') ? 'Total' : this.paymentForm.kind.startsWith('Saldo') ? 'Saldo' : 'Adelanto';

        this.transactions = [
            {
                client: this.paymentForm.client,
                email: this.paymentForm.email,
                productType: this.paymentForm.productType.includes('Personalizado') ? 'Personalizada' : 'Predeterminada',
                materials: this.paymentForm.materials,
                method,
                kind,
                amount: Number(this.paymentForm.amount || 0),
                operation: this.paymentForm.operation,
                date: '24 Jun 2026, 09:38',
                status: method === 'Online' ? 'online' : 'fisico'
            },
            ...this.transactions
        ];
    }
}
