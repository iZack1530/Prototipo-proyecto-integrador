using System.Security.Claims;
using System.Security.Cryptography;
using HorizonMythos.Servidor.Persistencia;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HorizonMythos.Servidor.Api.Cuentas;

public sealed record RegistroSolicitud(string Nombre, string Correo, string Contrasena);
public sealed record SesionSolicitud(string Correo, string Contrasena);
public sealed record RecuperarSolicitud(string Correo);
public sealed record RestablecerSolicitud(string Correo, string Token, string NuevaContrasena);

/// <summary>Registro, inicio/cierre de sesión y recuperación de contraseña por correo.</summary>
public static class CuentasApi
{
    public static void MapCuentas(this IEndpointRouteBuilder rutas)
    {
        var grupo = rutas.MapGroup("/api/cuentas");

        grupo.MapPost("/registro", async (RegistroSolicitud solicitud, ContextoBd bd,
            HttpContext contexto, ILoggerFactory registro) =>
        {
            string error = ValidarRegistro(solicitud);
            if (error.Length > 0) return Results.BadRequest(new { error });

            string correo = solicitud.Correo.Trim().ToLowerInvariant();
            string nombre = solicitud.Nombre.Trim();
            bool existe = await bd.Usuarios.AnyAsync(u => u.Correo == correo || u.NombreVisible == nombre);
            if (existe)
                return Results.Conflict(new { error = "El correo o el nombre visible ya están registrados." });

            var usuario = new Usuario
            {
                NombreVisible = nombre,
                Correo = correo,
                HashContrasena = HashContrasena.Crear(solicitud.Contrasena)
            };
            bd.Usuarios.Add(usuario);
            await bd.SaveChangesAsync();

            await IniciarSesionAsync(contexto, usuario);
            registro.CreateLogger("Cuentas").LogInformation("Alta de usuario {Usuario}.", usuario.Id);
            return Results.Created($"/api/cuentas/yo", new
            {
                id = usuario.Id,
                nombreVisible = usuario.NombreVisible,
                correo = usuario.Correo
            });
        });

        grupo.MapPost("/iniciar-sesion", async (SesionSolicitud solicitud, ContextoBd bd,
            HttpContext contexto) =>
        {
            if (string.IsNullOrWhiteSpace(solicitud.Correo) || string.IsNullOrWhiteSpace(solicitud.Contrasena))
                return Results.BadRequest(new { error = "Correo y contraseña son obligatorios." });

            string correo = solicitud.Correo.Trim().ToLowerInvariant();
            Usuario? usuario = await bd.Usuarios.FirstOrDefaultAsync(u => u.Correo == correo);
            if (usuario == null || !HashContrasena.Verificar(solicitud.Contrasena, usuario.HashContrasena))
                return Results.Unauthorized();

            await IniciarSesionAsync(contexto, usuario);
            return Results.Ok(new { id = usuario.Id, nombreVisible = usuario.NombreVisible });
        });

        grupo.MapPost("/cerrar-sesion", async (HttpContext contexto) =>
        {
            await contexto.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Results.NoContent();
        }).RequireAuthorization();

        grupo.MapGet("/yo", async (HttpContext contexto, ContextoBd bd) =>
        {
            Guid? id = contexto.User.ObtenerUsuarioId();
            if (id == null) return Results.Unauthorized();
            Usuario? usuario = await bd.Usuarios.FindAsync(id.Value);
            if (usuario == null) return Results.Unauthorized();
            return Results.Ok(new
            {
                id = usuario.Id,
                nombreVisible = usuario.NombreVisible,
                correo = usuario.Correo,
                creadoEn = usuario.CreadoEn
            });
        }).RequireAuthorization();

        grupo.MapPost("/recuperar", async (RecuperarSolicitud solicitud, ContextoBd bd,
            IEnvioCorreo correo, IConfiguration configuracion) =>
        {
            if (string.IsNullOrWhiteSpace(solicitud.Correo))
                return Results.BadRequest(new { error = "El correo es obligatorio." });

            string destino = solicitud.Correo.Trim().ToLowerInvariant();
            Usuario? usuario = await bd.Usuarios.FirstOrDefaultAsync(u => u.Correo == destino);
            if (usuario != null)
            {
                string token = Convert.ToHexString(RandomNumberGenerator.GetBytes(24));
                usuario.TokenRecuperacion = token;
                usuario.TokenRecuperacionExpira = DateTimeOffset.UtcNow.AddHours(1);
                await bd.SaveChangesAsync();

                string baseUrl = configuracion["Sitio:UrlPublica"] ?? "http://localhost:8000";
                await correo.EnviarAsync(usuario.Correo, "Recuperar contraseña de Horizon Mythos",
                    $"Hola {usuario.NombreVisible}:\n\nUsa este token para restablecer tu contraseña: {token}\n" +
                    $"Caduca en una hora.\n\n{baseUrl}/recuperar\n");
            }

            // Nunca revelamos si el correo está registrado.
            return Results.Ok(new { mensaje = "Si el correo está registrado, recibirás instrucciones." });
        });

        grupo.MapPost("/restablecer", async (RestablecerSolicitud solicitud, ContextoBd bd) =>
        {
            if (string.IsNullOrWhiteSpace(solicitud.NuevaContrasena) || solicitud.NuevaContrasena.Length < 8)
                return Results.BadRequest(new { error = "La nueva contraseña debe tener al menos 8 caracteres." });

            string correo = (solicitud.Correo ?? "").Trim().ToLowerInvariant();
            Usuario? usuario = await bd.Usuarios.FirstOrDefaultAsync(u => u.Correo == correo);
            if (usuario == null || usuario.TokenRecuperacion == null ||
                usuario.TokenRecuperacion != solicitud.Token ||
                usuario.TokenRecuperacionExpira == null ||
                usuario.TokenRecuperacionExpira < DateTimeOffset.UtcNow)
                return Results.BadRequest(new { error = "Token inválido o caducado." });

            usuario.HashContrasena = HashContrasena.Crear(solicitud.NuevaContrasena);
            usuario.TokenRecuperacion = null;
            usuario.TokenRecuperacionExpira = null;
            await bd.SaveChangesAsync();
            return Results.Ok(new { mensaje = "Contraseña actualizada." });
        });
    }

    private static string ValidarRegistro(RegistroSolicitud solicitud)
    {
        if (solicitud == null) return "Solicitud vacía.";
        if (string.IsNullOrWhiteSpace(solicitud.Nombre) || solicitud.Nombre.Trim().Length < 3)
            return "El nombre visible debe tener al menos 3 caracteres.";
        if (solicitud.Nombre.Trim().Length > 60)
            return "El nombre visible no puede superar 60 caracteres.";
        if (string.IsNullOrWhiteSpace(solicitud.Correo) || !solicitud.Correo.Contains('@'))
            return "El correo no es válido.";
        if (string.IsNullOrWhiteSpace(solicitud.Contrasena) || solicitud.Contrasena.Length < 8)
            return "La contraseña debe tener al menos 8 caracteres.";
        return "";
    }

    private static async Task IniciarSesionAsync(HttpContext contexto, Usuario usuario)
    {
        var identidad = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new Claim(ClaimTypes.Name, usuario.NombreVisible),
            new Claim(ClaimTypes.Email, usuario.Correo)
        }, CookieAuthenticationDefaults.AuthenticationScheme);

        await contexto.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identidad), new AuthenticationProperties
            {
                IsPersistent = true,
                ExpiresUtc = DateTimeOffset.UtcNow.AddDays(14)
            });
    }
}
