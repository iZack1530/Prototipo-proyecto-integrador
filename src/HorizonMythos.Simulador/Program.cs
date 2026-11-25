using System.Diagnostics;
using HorizonMythos.Nucleo.Aleatorio;
using HorizonMythos.Nucleo.Combate;
using HorizonMythos.Nucleo.Datos;
using HorizonMythos.Nucleo.Formatos;
using HorizonMythos.Nucleo.Modelos;

namespace HorizonMythos.Simulador;

/// <summary>
/// Simulación masiva por consola. Solo usa el Núcleo: misma RNG, mismo motor y mismos
/// formatos que el servidor, de modo que una semilla reproduce un combate exactamente.
/// </summary>
public static class Programa
{
    private const int MaxTurnos = 100;

    public static int Main(string[] args)
    {
        if (args.Contains("--ayuda") || args.Contains("-h"))
        {
            ImprimirAyuda();
            return 0;
        }

        Opciones opciones;
        try
        {
            opciones = Opciones.Leer(args);
        }
        catch (ArgumentException ex)
        {
            Console.Error.WriteLine("Error: " + ex.Message);
            ImprimirAyuda();
            return 2;
        }

        try
        {
            string rutaCatalogo = opciones.Catalogo ??
                Path.Combine(AppContext.BaseDirectory, "datos_prueba.json");
            if (!File.Exists(rutaCatalogo))
                throw new FileNotFoundException("No se encontró el catálogo de datos", rutaCatalogo);
            Catalogo catalogo = CargadorCatalogo.CargarDatosPrueba(File.ReadAllText(rutaCatalogo));

            var reloj = Stopwatch.StartNew();
            var resultados = new Resumen();

            for (int i = 0; i < opciones.Combates; i++)
            {
                EjecutarCombate(catalogo, opciones, i, resultados);
                if ((i + 1) % 500 == 0)
                    Console.WriteLine($"  {i + 1}/{opciones.Combates} combates…");
            }

            reloj.Stop();
            ImprimirResumen(resultados, opciones, reloj.ElapsedMilliseconds);
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("Error durante la simulación: " + ex.Message);
            return 1;
        }
    }

    private static void EjecutarCombate(Catalogo catalogo, Opciones opciones, int numero, Resumen resumen)
    {
        string semilla = $"{opciones.Semilla}:{numero}";
        Rng rng = new Rng(semilla);
        Formato formato = opciones.Formato;

        IReadOnlyList<string> equipoA = ElegirEquipo(catalogo, rng, formato);
        IReadOnlyList<string> equipoB = ElegirEquipo(catalogo, rng, formato);

        foreach (string id in equipoA.Concat(equipoB))
            if (catalogo.ObtenerCriatura(id) == null)
                throw new InvalidOperationException($"Criatura desconocida «{id}» en el combate {numero}");

        Batalla batalla = Batalla.Crear(catalogo, equipoA, equipoB, formato, semilla);
        int turnos = 0;

        while (!batalla.Terminado && turnos < MaxTurnos)
        {
            EstadoCombate estado = batalla.ObtenerEstado();
            Accion[] acciones = ElegirAcciones(catalogo, rng, estado, equipoA, equipoB, formato.Activos);
            IReadOnlyList<EventoCombate> eventos = batalla.ResolverTurno(acciones);
            turnos++;

            foreach (EventoCombate evento in eventos)
                if (evento.Mensaje.Contains("NaN") || evento.Mensaje.Contains("Infinity"))
                    throw new InvalidOperationException(
                        $"Valor no finito en el combate {numero}, turno {turnos}: {evento.Mensaje}");

            EstadoCombate despues = batalla.ObtenerEstado();
            for (int lado = 0; lado < 2; lado++)
                foreach (int ti in despues.A[lado])
                {
                    UnidadEstado unidad = despues.U[lado][ti];
                    if (unidad.Hp < 0 || unidad.Mp < 0)
                        throw new InvalidOperationException(
                            $"Estado negativo en el combate {numero}, turno {turnos}");
                }

            // Los eventos ya se han comprobado: no hace falta conservar el historial.
            batalla.LimpiarRegistros();
        }

        if (turnos >= MaxTurnos && !batalla.Terminado)
            resumen.Indecisos++;

        EstadoCombate final = batalla.ObtenerEstado();
        bool[] derrotados =
        {
            final.U[0].All(u => u.Ko),
            final.U[1].All(u => u.Ko)
        };
        if (derrotados[0] && derrotados[1]) resumen.Empates++;
        else if (derrotados[0]) resumen.VictoriasB++;
        else if (derrotados[1]) resumen.VictoriasA++;
        resumen.Turnos += turnos;
    }

    private static IReadOnlyList<string> ElegirEquipo(Catalogo catalogo, Rng rng, Formato formato)
    {
        int tamano = formato.ExigirTamano
            ? formato.TamanoEquipo
            : Math.Min(4, catalogo.Criaturas.Count);
        var disponibles = catalogo.Criaturas.Select(c => c.Id).ToList();
        var equipo = new List<string>();
        for (int i = 0; i < tamano && disponibles.Count > 0; i++)
        {
            int indice = (int)Math.Floor(rng.Siguiente() * disponibles.Count);
            equipo.Add(disponibles[indice]);
            disponibles.RemoveAt(indice);
        }
        var errores = ValidadorEquipo.Validar(catalogo, equipo, formato);
        if (errores.Count > 0)
            throw new InvalidOperationException("Equipo generado no válido: " + string.Join("; ", errores));
        return equipo;
    }

    private static Accion[] ElegirAcciones(Catalogo catalogo, Rng rng, EstadoCombate estado,
        IReadOnlyList<string> equipoA, IReadOnlyList<string> equipoB, int activos)
    {
        var acciones = new List<Accion>();
        for (int lado = 0; lado < 2; lado++)
        {
            IReadOnlyList<string> equipo = lado == 0 ? equipoA : equipoB;
            for (int pos = 0; pos < activos; pos++)
            {
                int ti = estado.A[lado][pos];
                UnidadEstado unidad = estado.U[lado][ti];
                Criatura criatura = catalogo.ObtenerCriatura(equipo[ti]);
                if (unidad.Ko || criatura == null)
                {
                    acciones.Add(new Accion { Tipo = "guardar" });
                    continue;
                }

                List<Ataque> asequibles = criatura.Ataques
                    .Select(catalogo.ObtenerAtaque)
                    .Where(m => m != null && Reglas.Coste(criatura.Tipos, m) <= unidad.Mp)
                    .ToList()!;

                if (asequibles.Count == 0)
                {
                    acciones.Add(new Accion { Tipo = unidad.Cd > 0 ? "recuperar" : "guardar" });
                    continue;
                }

                Ataque movimiento = asequibles[(int)Math.Floor(rng.Siguiente() * asequibles.Count)];
                var rivales = new List<int>();
                foreach (int rivalTi in estado.A[1 - lado])
                    if (!estado.U[1 - lado][rivalTi].Ko) rivales.Add(rivalTi);
                string objetivo = rivales.Count > 0
                    ? $"{1 - lado}:{rivales[(int)Math.Floor(rng.Siguiente() * rivales.Count)]}"
                    : $"{1 - lado}:0";
                acciones.Add(Accion.Atacar(movimiento.Id!, objetivo));
            }
        }
        return acciones.ToArray();
    }

    private static void ImprimirAyuda()
    {
        Console.WriteLine("Uso: dotnet run --project src/HorizonMythos.Simulador -- [opciones]");
        Console.WriteLine();
        Console.WriteLine("  --combates N     Número de combates (por defecto 100)");
        Console.WriteLine("  --semilla TEXTO  Prefijo de semilla (por defecto 'simulacion')");
        Console.WriteLine("  --formato ID     laboratorio | 3v3 | 5v5-elige-3 (por defecto laboratorio)");
        Console.WriteLine("  --catalogo RUTA  Catálogo JSON v5 (por defecto datos_prueba.json)");
        Console.WriteLine("  --ayuda          Muestra esta ayuda");
    }

    private static void ImprimirResumen(Resumen resumen, Opciones opciones, long milisegundos)
    {
        Console.WriteLine();
        Console.WriteLine("Horizon Mythos — simulación masiva");
        Console.WriteLine($"  Combates:          {opciones.Combates}");
        Console.WriteLine($"  Semilla:           {opciones.Semilla}");
        Console.WriteLine($"  Formato:           {opciones.Formato.Id}");
        Console.WriteLine($"  Victoria equipo A: {resumen.VictoriasA}");
        Console.WriteLine($"  Victoria equipo B: {resumen.VictoriasB}");
        Console.WriteLine($"  Empates:           {resumen.Empates}");
        Console.WriteLine($"  Indecisos:         {resumen.Indecisos}");
        Console.WriteLine($"  Turnos totales:    {resumen.Turnos}");
        Console.WriteLine($"  Turnos por combate:{(resumen.Turnos / (double)Math.Max(1, opciones.Combates)):F1}");
        Console.WriteLine($"  Tiempo:            {milisegundos} ms");
    }

    private sealed class Resumen
    {
        public int VictoriasA;
        public int VictoriasB;
        public int Empates;
        public int Indecisos;
        public int Turnos;
    }

    private sealed class Opciones
    {
        public int Combates { get; private set; } = 100;
        public string Semilla { get; private set; } = "simulacion";
        public string? Catalogo { get; private set; }
        public Formato Formato { get; private set; } = Formato.Laboratorio;

        public static Opciones Leer(string[] args)
        {
            var opciones = new Opciones();
            for (int i = 0; i < args.Length; i++)
            {
                string arg = args[i];
                switch (arg)
                {
                    case "--combates":
                        if (!IntParseo.TryValor(Siguiente(args, ref i), out int n) || n <= 0)
                            throw new ArgumentException("--combates debe ser un entero positivo");
                        opciones.Combates = n;
                        break;
                    case "--semilla":
                        opciones.Semilla = Siguiente(args, ref i);
                        break;
                    case "--formato":
                        string id = Siguiente(args, ref i);
                        opciones.Formato = id switch
                        {
                            "laboratorio" => Formato.Laboratorio,
                            "3v3" => Formato.TresVsTres,
                            "5v5-elige-3" => Formato.CincoEligeTres,
                            _ => throw new ArgumentException("Formato desconocido: " + id)
                        };
                        break;
                    case "--catalogo":
                        opciones.Catalogo = Siguiente(args, ref i);
                        break;
                    default:
                        throw new ArgumentException("Opción desconocida: " + arg);
                }
            }
            return opciones;
        }

        private static string Siguiente(string[] args, ref int i)
        {
            if (++i >= args.Length) throw new ArgumentException("Falta el valor de " + args[i - 1]);
            return args[i];
        }
    }
}

/// <summary>Utilidad de parseo para no depender de valores globales.</summary>
internal static class IntParseo
{
    public static bool TryValor(string texto, out int valor) => int.TryParse(texto, out valor);
}
