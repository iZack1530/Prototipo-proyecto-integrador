using System.Collections.Concurrent;

namespace HorizonMythos.Servidor.Servicios;

public sealed record Presencia(string Nombre, string ConexionId, Guid? UsuarioId);

/// <summary>Registro en memoria de jugadores conectados para el desafío directo por nombre.</summary>
public sealed class PresenciaServicio
{
    private readonly object _candado = new();
    private readonly ConcurrentDictionary<string, Presencia> _porNombre =
        new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<string, string> _porConexion = new();

    public void Registrar(string nombre, string conexionId, Guid? usuarioId)
    {
        if (string.IsNullOrWhiteSpace(nombre) || string.IsNullOrWhiteSpace(conexionId)) return;
        string limpio = nombre.Trim();
        lock (_candado)
        {
            if (_porConexion.TryGetValue(conexionId, out string? anterior) &&
                !string.Equals(anterior, limpio, StringComparison.OrdinalIgnoreCase))
                _porNombre.TryRemove(anterior, out _);

            _porNombre[limpio] = new Presencia(limpio, conexionId, usuarioId);
            _porConexion[conexionId] = limpio;
        }
    }

    public Presencia? Buscar(string nombre)
    {
        if (string.IsNullOrWhiteSpace(nombre)) return null;
        lock (_candado)
        {
            return _porNombre.TryGetValue(nombre.Trim(), out Presencia? presencia) ? presencia : null;
        }
    }

    public Presencia? BuscarPorConexion(string conexionId)
    {
        lock (_candado)
        {
            if (_porConexion.TryGetValue(conexionId, out string? nombre) &&
                _porNombre.TryGetValue(nombre, out Presencia? presencia))
                return presencia;
            return null;
        }
    }

    public void Quitar(string conexionId)
    {
        lock (_candado)
        {
            if (_porConexion.TryRemove(conexionId, out string? nombre))
                _porNombre.TryRemove(nombre, out _);
        }
    }
}
