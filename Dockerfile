# Image unique pour Render : Angular est compile puis place dans le jar Spring Boot (cf. CDC partie 3).
# Contexte de build = racine du depot.

# --- Etape 1 : build Angular ---
FROM node:22-alpine AS front
WORKDIR /front
COPY front/package.json front/package-lock.json ./
RUN npm ci
COPY front/ ./
RUN npx ng build --configuration production

# --- Etape 2 : build Maven (le site Angular est copie dans static/) ---
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY back/.mvn .mvn
COPY back/mvnw back/pom.xml ./
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw && ./mvnw -B -q dependency:go-offline
COPY back/src src
COPY --from=front /front/dist/front/browser src/main/resources/static
RUN ./mvnw -B -q package -DskipTests

# --- Etape 3 : execution ---
FROM eclipse-temurin:17-jre
ENV TZ=Africa/Tunis \
    JAVA_OPTS="-Xmx350m"
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
RUN mkdir -p /app/uploads
# Render fournit la variable PORT (lue par server.port=${PORT:8081})
EXPOSE 8081
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
