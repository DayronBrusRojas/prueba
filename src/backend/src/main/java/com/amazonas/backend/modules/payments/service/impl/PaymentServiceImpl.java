package com.amazonas.backend.modules.payments.service.impl;

import com.amazonas.backend.modules.payments.dto.DailyStatsResponse;
import com.amazonas.backend.modules.payments.dto.RegisterPaymentRequest;
import com.amazonas.backend.modules.payments.enums.PaymentMethod;
import com.amazonas.backend.modules.payments.model.PaymentTransaction;
import com.amazonas.backend.modules.payments.repository.PaymentTransactionRepository;
import com.amazonas.backend.modules.payments.service.PaymentService;
import com.amazonas.backend.modules.users.model.User;
import com.amazonas.backend.modules.users.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PaymentServiceImpl implements PaymentService {

    private final PaymentTransactionRepository paymentRepository;
    private final UserRepository userRepository;

    @Override
    public PaymentTransaction registerPayment(RegisterPaymentRequest request) {
        log.info("Registrando transacción de pago para el cliente con correo: {}", request.clientEmail());

        UUID clientId = userRepository.findByEmail(request.clientEmail())
                .map(User::getId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "No se encontró un usuario registrado con el correo: " + request.clientEmail()
                ));

        PaymentTransaction transaction = PaymentTransaction.builder()
                .clientId(clientId)
                .roomId(request.roomId())
                .monto(request.monto())
                .metodoPago(request.metodoPago())
                .tipoAbono(request.tipoAbono())
                .tipoMaqueta(request.tipoMaqueta())
                .materiales(request.materiales())
                .fechaTransaccion(request.fechaTransaccion())
                .codigoOperacion(request.codigoOperacion())
                .build();

        return paymentRepository.save(transaction);
    }

    @Override
    @Transactional(readOnly = true)
    public DailyStatsResponse getDailyStats() {
        // Obtenemos el inicio y fin del día actual en UTC
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        OffsetDateTime startOfDay = today.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime endOfDay = today.atTime(LocalTime.MAX).atOffset(ZoneOffset.UTC);

        BigDecimal ventasTotales = paymentRepository.sumMontoBetween(startOfDay, endOfDay);
        long onlineCount = paymentRepository.countByMetodoPagoAndFechaTransaccionBetween(PaymentMethod.ONLINE, startOfDay, endOfDay);
        long fisicoCount = paymentRepository.countByMetodoPagoAndFechaTransaccionBetween(PaymentMethod.FISICO, startOfDay, endOfDay);

        return new DailyStatsResponse(ventasTotales, onlineCount, fisicoCount);
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.List<com.amazonas.backend.modules.payments.dto.PaymentTransactionResponse> getAllTransactions() {
        log.info("Obteniendo todas las transacciones de pago");
        return paymentRepository.findAll().stream()
                .map(transaction -> {
                    String clientName = "Cliente Desconocido";
                    String clientEmail = "desconocido@correo.com";
                    try {
                        User user = userRepository.findById(transaction.getClientId()).orElse(null);
                        if (user != null) {
                            clientName = user.getNombre();
                            clientEmail = user.getEmail();
                        }
                    } catch (Exception e) {
                        log.error("Error al buscar usuario para ID: {}", transaction.getClientId(), e);
                    }
                    return new com.amazonas.backend.modules.payments.dto.PaymentTransactionResponse(
                            transaction.getId(),
                            transaction.getClientId(),
                            clientName,
                            clientEmail,
                            transaction.getRoomId(),
                            transaction.getMonto(),
                            transaction.getMetodoPago(),
                            transaction.getTipoAbono(),
                            transaction.getTipoMaqueta(),
                            transaction.getMateriales(),
                            transaction.getFechaTransaccion(),
                            transaction.getCodigoOperacion()
                    );
                })
                .sorted((t1, t2) -> t2.fechaTransaccion().compareTo(t1.fechaTransaccion()))
                .toList();
    }
}
