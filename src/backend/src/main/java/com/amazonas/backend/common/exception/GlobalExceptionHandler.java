package com.amazonas.backend.common.exception;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatusException(
            org.springframework.web.server.ResponseStatusException ex) {
        Map<String, String> response = new HashMap<>();
        response.put("message", ex.getReason());
        return ResponseEntity.status(ex.getStatusCode()).body(response);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex) {
        Map<String, String> response = new HashMap<>();
        response.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(
            org.springframework.web.bind.MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        if (ex.getBindingResult().getFieldError() != null) {
            errors.put("message", ex.getBindingResult().getFieldError().getDefaultMessage());
        } else {
            errors.put("message", "Error de validación en los datos.");
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDataIntegrityViolationException(
            org.springframework.dao.DataIntegrityViolationException ex) {
        Map<String, String> response = new HashMap<>();
        String msg = ex.getMessage();
        if (msg != null && (msg.contains("users_email_key") || msg.contains("email") || msg.contains("duplicate key"))) {
            response.put("message", "El correo ya se encuentra registrado");
        } else {
            response.put("message", "Error de integridad de datos en el servidor.");
        }
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleAllExceptions(Exception ex) {
        Map<String, String> response = new HashMap<>();
        response.put("message", ex.getMessage() != null ? ex.getMessage() : "Ocurrió un error inesperado en el servidor.");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
