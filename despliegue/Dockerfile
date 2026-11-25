# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS compilacion
WORKDIR /origen

COPY HorizonMythos.sln ./
COPY src/HorizonMythos.Nucleo/HorizonMythos.Nucleo.csproj src/HorizonMythos.Nucleo/
COPY src/HorizonMythos.Servidor/HorizonMythos.Servidor.csproj src/HorizonMythos.Servidor/
COPY datos_prueba.json ./

RUN dotnet restore src/HorizonMythos.Servidor/HorizonMythos.Servidor.csproj

COPY src/HorizonMythos.Nucleo/ src/HorizonMythos.Nucleo/
COPY src/HorizonMythos.Servidor/ src/HorizonMythos.Servidor/

RUN dotnet publish src/HorizonMythos.Servidor/HorizonMythos.Servidor.csproj \
    --configuration Release --no-restore --output /app/publicacion /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS ejecucion
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_EnableDiagnostics=0

COPY --from=compilacion /app/publicacion ./
RUN mkdir -p /app/wwwroot/media

EXPOSE 8080
ENTRYPOINT ["dotnet", "HorizonMythos.Servidor.dll"]
