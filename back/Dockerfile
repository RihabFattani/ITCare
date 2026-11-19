# --- Etape 1 : compilation Maven (JDK 17) ---
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw && ./mvnw -B -q dependency:go-offline
COPY src src
RUN ./mvnw -B -q package -DskipTests

# --- Etape 2 : execution (JRE 17) ---
FROM eclipse-temurin:17-jre
ENV TZ=Africa/Tunis \
    JAVA_OPTS="-Xmx400m"
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# Le dossier uploads est monte comme volume (logos, captures, rapports PDF)
RUN mkdir -p /app/uploads
EXPOSE 8081
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
