namespace HorizonMythos.Nucleo.Combate
{
    /// <summary>Entrada ordenada de una acción dentro de un turno.</summary>
    internal sealed class Turno
    {
        public Unidad U { get; set; }
        public int Lado { get; set; }
        public int Pos { get; set; }
        public int Ti { get; set; }
        public Accion A { get; set; }
        public int Prioridad { get; set; }
        public double Velocidad { get; set; }
        public double Desempate { get; set; }
    }
}
