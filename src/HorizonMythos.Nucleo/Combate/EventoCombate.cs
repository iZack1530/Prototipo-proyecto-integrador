namespace HorizonMythos.Nucleo.Combate
{
    /// <summary>Evento emitido por el Núcleo. El cliente solo dibuja estos eventos.</summary>
    public sealed class EventoCombate
    {
        public EventoCombate(string mensaje, string categoria = "", int lado = -1, int indice = -1)
        {
            Mensaje = mensaje;
            Categoria = categoria;
            Lado = lado;
            Indice = indice;
        }

        public string Mensaje { get; }
        public string Categoria { get; }
        public int Lado { get; }
        public int Indice { get; }

        public override string ToString() => Mensaje;
    }
}
