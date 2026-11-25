namespace HorizonMythos.Servidor.Servicios;

/// <summary>Opciones del combate en línea; se pueden sobrescribir por configuración.</summary>
public sealed class OpcionesCombate
{
    public int SegundosTurno { get; set; } = 45;
    public int TurnosMaximos { get; set; } = 300;
}
