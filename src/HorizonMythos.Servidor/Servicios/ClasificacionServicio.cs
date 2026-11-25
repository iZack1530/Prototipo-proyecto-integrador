using Microsoft.EntityFrameworkCore;
using HorizonMythos.Servidor.Persistencia;

namespace HorizonMythos.Servidor.Servicios;

/// <summary>Actualiza la clasificación (Elo, K=32) tras cada combate entre cuentas.</summary>
public sealed class ClasificacionServicio
{
    private const double K = 32;
    private readonly ContextoBd _bd;

    public ClasificacionServicio(ContextoBd bd)
    {
        _bd = bd;
    }

    public async Task RegistrarAsync(Guid? ganadorId, Guid? perdedorId, string formato,
        CancellationToken cancelacion = default)
    {
        if (ganadorId == null || perdedorId == null || ganadorId == perdedorId) return;
        string clave = string.IsNullOrWhiteSpace(formato) ? "3v3" : formato;

        Clasificacion ganador = await ObtenerOCrearAsync(ganadorId.Value, clave, cancelacion);
        Clasificacion perdedor = await ObtenerOCrearAsync(perdedorId.Value, clave, cancelacion);

        double esperadoGanador = 1 / (1 + Math.Pow(10, (perdedor.Puntos - ganador.Puntos) / 400));
        double esperadoPerdedor = 1 - esperadoGanador;

        ganador.Puntos = Math.Round(ganador.Puntos + K * (1 - esperadoGanador), 2, MidpointRounding.AwayFromZero);
        perdedor.Puntos = Math.Round(perdedor.Puntos + K * (0 - esperadoPerdedor), 2, MidpointRounding.AwayFromZero);
        ganador.Victorias++;
        ganador.Partidas++;
        perdedor.Derrotas++;
        perdedor.Partidas++;
        DateTimeOffset ahora = DateTimeOffset.UtcNow;
        ganador.ActualizadoEn = ahora;
        perdedor.ActualizadoEn = ahora;

        await _bd.SaveChangesAsync(cancelacion);
    }

    private async Task<Clasificacion> ObtenerOCrearAsync(Guid usuarioId, string formato,
        CancellationToken cancelacion)
    {
        Clasificacion? existente = await _bd.Clasificaciones
            .FirstOrDefaultAsync(c => c.UsuarioId == usuarioId && c.Formato == formato, cancelacion);
        if (existente != null) return existente;

        var nueva = new Clasificacion { UsuarioId = usuarioId, Formato = formato };
        _bd.Clasificaciones.Add(nueva);
        return nueva;
    }
}
