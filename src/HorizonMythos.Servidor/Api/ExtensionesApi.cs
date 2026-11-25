using System.Security.Claims;

namespace HorizonMythos.Servidor.Api;

/// <summary>Utilidades para leer la identidad del usuario autenticado por cookie.</summary>
public static class ExtensionesApi
{
    public static Guid? ObtenerUsuarioId(this ClaimsPrincipal usuario)
    {
        string? valor = usuario.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(valor, out Guid id) ? id : null;
    }

    public static string ObtenerNombreVisible(this ClaimsPrincipal usuario)
        => usuario.FindFirstValue(ClaimTypes.Name) ?? "Jugador";
}
