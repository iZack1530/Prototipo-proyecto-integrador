using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using HorizonMythos.Servidor.Persistencia;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace HorizonMythos.Servidor.Pruebas;

public sealed class CuentasTests
{
    [Fact]
    public async Task RegistroSesionYRecuperacion_FlujoCompleto()
    {
        using var fabrica = new FabricaServidor();
        using HttpClient cliente = fabrica.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true
        });
        string correo = "cuenta@ejemplo.mx";

        HttpResponseMessage registro = await cliente.PostAsJsonAsync("/api/cuentas/registro", new
        {
            nombre = "cuenta-prueba",
            correo,
            contrasena = "secreto123"
        });
        Assert.Equal(HttpStatusCode.Created, registro.StatusCode);

        JsonElement yo = await cliente.GetFromJsonAsync<JsonElement>("/api/cuentas/yo");
        Assert.Equal("cuenta-prueba", yo.GetProperty("nombreVisible").GetString());

        HttpResponseMessage duplicado = await cliente.PostAsJsonAsync("/api/cuentas/registro", new
        {
            nombre = "otro-nombre",
            correo,
            contrasena = "secreto123"
        });
        Assert.Equal(HttpStatusCode.Conflict, duplicado.StatusCode);

        HttpResponseMessage cierre = await cliente.PostAsync("/api/cuentas/cerrar-sesion", null);
        Assert.Equal(HttpStatusCode.NoContent, cierre.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await cliente.GetAsync("/api/cuentas/yo")).StatusCode);

        HttpResponseMessage malLogin = await cliente.PostAsJsonAsync("/api/cuentas/iniciar-sesion", new
        {
            correo,
            contrasena = "incorrecta"
        });
        Assert.Equal(HttpStatusCode.Unauthorized, malLogin.StatusCode);

        HttpResponseMessage login = await cliente.PostAsJsonAsync("/api/cuentas/iniciar-sesion", new
        {
            correo,
            contrasena = "secreto123"
        });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);

        HttpResponseMessage recuperar = await cliente.PostAsJsonAsync("/api/cuentas/recuperar", new { correo });
        Assert.Equal(HttpStatusCode.OK, recuperar.StatusCode);

        string token;
        using (IServiceScope ambito = fabrica.Services.CreateScope())
        {
            ContextoBd bd = ambito.ServiceProvider.GetRequiredService<ContextoBd>();
            Usuario usuario = await bd.Usuarios.SingleAsync(u => u.Correo == correo);
            token = usuario.TokenRecuperacion ?? "";
        }
        Assert.False(string.IsNullOrWhiteSpace(token));

        HttpResponseMessage restablecer = await cliente.PostAsJsonAsync("/api/cuentas/restablecer", new
        {
            correo,
            token,
            nuevaContrasena = "nuevaClave123"
        });
        Assert.Equal(HttpStatusCode.OK, restablecer.StatusCode);

        HttpResponseMessage loginNuevo = await cliente.PostAsJsonAsync("/api/cuentas/iniciar-sesion", new
        {
            correo,
            contrasena = "nuevaClave123"
        });
        Assert.Equal(HttpStatusCode.OK, loginNuevo.StatusCode);
    }

    [Fact]
    public async Task Registro_InvalidoDevuelveBadRequest()
    {
        using var fabrica = new FabricaServidor();
        using HttpClient cliente = fabrica.CreateClient();

        HttpResponseMessage respuesta = await cliente.PostAsJsonAsync("/api/cuentas/registro", new
        {
            nombre = "ab",
            correo = "sin-arroba",
            contrasena = "corta"
        });

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }
}
