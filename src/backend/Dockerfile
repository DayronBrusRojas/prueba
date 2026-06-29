# Etapa 1: Construcción (Build)
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /build

# Copiar el archivo de configuración Maven POM
COPY pom.xml .

# Descargar las dependencias en una capa separada para aprovechar el caché de Docker
RUN mvn dependency:go-offline -B

# Copiar el código fuente y compilar el proyecto omitiendo los tests
COPY src ./src
RUN mvn clean package -DskipTests

# Etapa 2: Imagen de ejecución (Runtime)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Crear un usuario sin privilegios root por seguridad
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copiar exactamente el JAR gordo generado para evitar conflictos con el JAR '-plain.jar'
COPY --from=builder /build/target/backend-0.0.1-SNAPSHOT.jar app.jar

# Exponer el puerto por defecto de Spring Boot (8080)
EXPOSE 8080

# Configurar variables de entorno por defecto
ENV PORT=8080
ENV SPRING_PROFILES_ACTIVE=prod

# Ejecutar la aplicación con configuración dinámica de puerto (compatible con Render y local)
ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT} -jar app.jar"]
