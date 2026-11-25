using System;
using System.Collections.Generic;
using System.Linq;
using HorizonMythos.Nucleo.Aleatorio;
using HorizonMythos.Nucleo.Formulas;
using HorizonMythos.Nucleo.Formatos;
using HorizonMythos.Nucleo.Modelos;

namespace HorizonMythos.Nucleo.Combate
{
    /// <summary>
    /// Motor de combate por turnos. Es una réplica del motor JS del Laboratorio: mismo RNG,
    /// mismo orden de resolución y mismos eventos. Sin dependencias de ASP.NET ni de Unity.
    /// </summary>
    public sealed class Batalla
    {
        private static readonly Ataque Desesperacion = new Ataque
        {
            Id = "__desp",
            Nombre = "Esfuerzo desesperado",
            Tipo = "Neutro",
            Mp = 0,
            Categoria = "fis",
            Potencia = 40,
            Alcance = "uni",
            Aoe = 75,
            Prioridad = 0,
            Efectos = new List<Efecto>
            {
                new Efecto("recoil", new Dictionary<string, object> { { "p", 100d }, { "b", "hp" }, { "v", 10d } })
            }
        };

        private static readonly Dictionary<string, int> Prioridades = new Dictionary<string, int>
        {
            { "sw", 7 }, { "it", 5 }, { "pr", 4 }, { "atk", 0 }, { "em", 0 }, { "rc", -6 }
        };

        private readonly Catalogo _catalogo;
        private readonly Formato _formato;
        private readonly List<EventoCombate> _historial = new List<EventoCombate>();
        private readonly List<CalculoDanio> _calculos = new List<CalculoDanio>();
        private Rng _rng;
        private List<Unidad>[] _equipos = { new List<Unidad>(), new List<Unidad>() };
        private int[][] _activos = { new int[0], new int[0] };
        private Dictionary<string, int>[] _mochila;
        private List<EventoCombate> _captura;
        private string[] _nombres = { "Equipo A", "Equipo B" };
        private string _clima = "";
        private bool _terminado;
        private int? _perdedor;
        private string _semilla;

        private Batalla(Catalogo catalogo, Formato formato, string semilla)
        {
            _catalogo = catalogo ?? throw new ArgumentNullException(nameof(catalogo));
            _formato = formato ?? Formato.Laboratorio;
            _semilla = semilla ?? string.Empty;
            _rng = new Rng(_semilla);
            _mochila = new Dictionary<string, int>[2];
            for (int lado = 0; lado < 2; lado++)
                _mochila[lado] = new Dictionary<string, int>(Reglas.MochilaInicial);
        }

        /// <summary>Crea una batalla a partir de los identificadores de las criaturas de cada equipo.</summary>
        public static Batalla Crear(Catalogo catalogo, IReadOnlyList<string> equipoA,
            IReadOnlyList<string> equipoB, Formato formato, string semilla)
        {
            var batalla = new Batalla(catalogo, formato, semilla);
            var equipos = new[] { equipoA, equipoB };
            for (int lado = 0; lado < 2; lado++)
            {
                if (equipos[lado] == null) throw new ArgumentException("Un equipo no puede ser null");
                for (int i = 0; i < equipos[lado].Count; i++)
                {
                    Criatura criatura = catalogo.ObtenerCriatura(equipos[lado][i]);
                    if (criatura == null)
                        throw new ArgumentException("Criatura desconocida: " + equipos[lado][i]);
                    batalla._equipos[lado].Add(new Unidad(catalogo, criatura, "", "", lado, i));
                }
                int activos = Math.Min(batalla._formato.Activos, batalla._equipos[lado].Count);
                batalla._activos[lado] = Enumerable.Range(0, activos).ToArray();
            }
            return batalla;
        }

        public string Semilla => _semilla;
        public string Clima => _clima;
        public bool Terminado => _terminado;
        public int NumeroTurno => _rng == null ? 0 : _numeroTurno;
        public IReadOnlyList<EventoCombate> Historial => _historial;
        public IReadOnlyList<CalculoDanio> Calculos => _calculos;
        public IReadOnlyList<IReadOnlyList<Accion>> AccionesGrabadas => _accionesGrabadas;
        public IReadOnlyList<string> EquipoA => _equipos[0].Select(u => u.Id).ToList();
        public IReadOnlyList<string> EquipoB => _equipos[1].Select(u => u.Id).ToList();

        private int _numeroTurno;
        private readonly List<IReadOnlyList<Accion>> _accionesGrabadas = new List<IReadOnlyList<Accion>>();

        /// <summary>Contrato Núcleo ↔ Servidor: una acción por bando (1 contra 1).</summary>
        public IReadOnlyList<EventoCombate> ResolverTurno(Accion accionA, Accion accionB)
        {
            var acciones = new List<Accion> { accionA };
            for (int i = 1; i < _formato.Activos; i++) acciones.Add(null);
            acciones.Add(accionB);
            for (int i = 1; i < _formato.Activos; i++) acciones.Add(null);
            return ResolverTurno(acciones.ToArray());
        }

        /// <summary>Resuelve un turno con una acción por posición activa: lado 0 y después lado 1.</summary>
        public IReadOnlyList<EventoCombate> ResolverTurno(params Accion[] acciones)
        {
            int porLado = Math.Max(1, _formato.Activos);
            var repartidas = new Accion[2][];
            repartidas[0] = new Accion[porLado];
            repartidas[1] = new Accion[porLado];
            for (int lado = 0; lado < 2; lado++)
                for (int pos = 0; pos < porLado; pos++)
                {
                    int indice = lado * porLado + pos;
                    if (acciones != null && indice < acciones.Length) repartidas[lado][pos] = acciones[indice];
                }

            var captura = new List<EventoCombate>();
            _captura = captura;
            try
            {
                ResolverTurnoInterno(repartidas);
            }
            finally
            {
                _captura = null;
            }
            return captura;
        }

        public EstadoCombate ObtenerEstado()
        {
            var activos = new int[2][];
            var unidades = new UnidadEstado[2][];
            for (int lado = 0; lado < 2; lado++)
            {
                activos[lado] = (int[])_activos[lado].Clone();
                unidades[lado] = _equipos[lado].Select(u => u.ObtenerEstado()).ToArray();
            }
            return new EstadoCombate { N = _numeroTurno, W = _clima, A = activos, U = unidades };
        }

        private void ResolverTurnoInterno(Accion[][] acciones)
        {
            if (_terminado) return;
            _numeroTurno++;
            Registrar("— Turno " + _numeroTurno + " —", "t");

            for (int lado = 0; lado < 2; lado++)
            {
                foreach (Unidad u in _equipos[lado])
                {
                    u.UltimaGuardia = u.Protegido;
                    u.Protegido = false;
                    u.Guardias = new List<Guardia>();
                    u.Gl = 0;
                    u.Gmp = 0;
                    u.Recuperando = false;
                    if (u.Cd > 0) { u.Bloqueado = true; u.Cd--; u.Gc = 0; }
                    else { u.Bloqueado = false; if (!u.UltimaGuardia) u.Gc = 0; }
                }
            }

            var orden = new List<Turno>();
            var grabadas = new List<Accion>();
            for (int lado = 0; lado < 2; lado++)
            {
                for (int pos = 0; pos < _activos[lado].Length; pos++)
                {
                    int ti = _activos[lado][pos];
                    Unidad u = _equipos[lado][ti];
                    if (u.KO) continue;
                    Accion accion = acciones[lado][pos];
                    if (accion == null) continue;
                    accion = PrepararAccion(u, accion);
                    if (accion == null) continue;
                    grabadas.Add(accion);

                    Ataque movimiento = u.Movimientos.FirstOrDefault(m => m.Id == accion.MovimientoId);
                    int prioridad = Prioridades.ContainsKey(accion.Codigo) ? Prioridades[accion.Codigo] : 0;
                    if (accion.Codigo == "atk")
                    {
                        int bonus = movimiento == null ? 0 : Math.Max(-3, Math.Min(3, movimiento.Prioridad));
                        if (u.Primero)
                            bonus += Math.Min(3, u.Ab.Where(f => f.Clave == "pri").Sum(f => (int)f.Numero("v")));
                        prioridad += bonus;
                    }
                    orden.Add(new Turno
                    {
                        U = u, Lado = lado, Pos = pos, Ti = ti, A = accion,
                        Prioridad = prioridad, Velocidad = Eff(u, "spd"), Desempate = _rng.Siguiente()
                    });
                }
            }
            _accionesGrabadas.Add(grabadas);

            var ordenados = orden.OrderByDescending(t => t.Prioridad)
                .ThenByDescending(t => t.Velocidad).ThenBy(t => t.Desempate).ToList();

            Registrar("Orden: " + string.Join(" → ", ordenados.Select(x =>
                x.U.Nombre + " (" + NombreJugador(x.Lado) + ", prio +" + x.Prioridad +
                ", SPD " + TextosCombate.Num(EvaluadorFormulas.RedondearJs(x.Velocidad)) + ")")), "calc");

            foreach (Turno x in ordenados)
            {
                if (_terminado || x.U.KO || _activos[x.Lado][x.Pos] != x.Ti) continue;
                switch (x.A.Codigo)
                {
                    case "sw": HacerCambio(x); break;
                    case "it": HacerObjeto(x); break;
                    case "pr": HacerGuardia(x); break;
                    case "rc": HacerRecuperacion(x); break;
                    case "atk": HacerAtaque(x); break;
                    case "em": HacerEmergencia(x); break;
                }
                ComprobarFin();
            }
            if (!_terminado) FinalizarTurno();
        }

        /// <summary>Ajustes automáticos del Laboratorio para acciones inválidas (MP, guardia bloqueada...).</summary>
        private Accion PrepararAccion(Unidad u, Accion accion)
        {
            if (accion.Tipo == null) return accion;
            if (accion.Codigo == "em")
                accion = new Accion { Tipo = "atacar", MovimientoId = Desesperacion.Id, Objetivo = accion.Objetivo };

            bool sinMp = !u.Movimientos.Any(m => Coste(u, m) <= u.Mp);
            if (accion.Codigo == "atk" && accion.MovimientoId == Desesperacion.Id && !sinMp)
            {
                Ataque posible = u.Movimientos.FirstOrDefault(m => Coste(u, m) <= u.Mp);
                if (posible != null) accion.MovimientoId = posible.Id;
            }
            if (accion.Codigo == "atk" && sinMp && accion.MovimientoId != Desesperacion.Id)
            {
                accion.Tipo = u.Bloqueado ? "recuperar" : "guardar";
                Registrar(u.Nombre + " no tiene MP para ningún ataque: " +
                    (accion.Codigo == "pr" ? "se pone en guardia" : "recupera maná"));
            }
            else if (accion.Codigo == "pr" && u.Bloqueado)
            {
                accion.Tipo = sinMp ? "recuperar" : "atacar";
                if (accion.Codigo == "atk" && !u.Movimientos.Any(m => m.Id == accion.MovimientoId && Coste(u, m) <= u.Mp))
                {
                    Ataque posible = u.Movimientos.FirstOrDefault(m => Coste(u, m) <= u.Mp);
                    if (posible != null) accion.MovimientoId = posible.Id;
                }
                Registrar(u.Nombre + " no puede ponerse en guardia este turno");
            }
            return accion;
        }

        private string NombreJugador(int lado)
        {
            string nombre = _nombres[lado];
            if (string.IsNullOrWhiteSpace(nombre)) return "Jugador " + (lado + 1);
            return nombre.Trim();
        }

        private void Registrar(string mensaje, string categoria = "", Unidad objetivo = null)
        {
            var evento = new EventoCombate(mensaje, categoria, objetivo == null ? -1 : objetivo.Lado,
                objetivo == null ? -1 : objetivo.Indice);
            _historial.Add(evento);
            if (_captura != null) _captura.Add(evento);
        }

        private int Coste(Unidad u, Ataque m) => Reglas.Coste(u.Tipos, m);

        private IReadOnlyList<Unidad> Vivos(int lado) =>
            _activos[lado].Select(i => _equipos[lado][i]).Where(u => !u.KO).ToList();

        private double Eff(Unidad u, string clave, bool sinBoost = false)
        {
            double valor = u.Estadisticas.Obtener(clave);
            int nivel;
            if (u.Bo.TryGetValue(clave.ToUpperInvariant(), out nivel) && !sinBoost)
                valor *= Reglas.MultiplicadorBoost(nivel);
            if (u.Estado != null) valor *= Reglas.MultiplicadorEstado(u.Estado, clave);

            Dictionary<string, double> pasivo;
            if (!string.IsNullOrEmpty(u.Pasivo) && Reglas.ObjetosPasivos.TryGetValue(u.Pasivo, out pasivo))
            {
                double multiplicador;
                if (pasivo.TryGetValue(clave, out multiplicador)) valor *= multiplicador;
            }

            if (!string.IsNullOrEmpty(_clima) && Reglas.Climas.TryGetValue(_clima, out Clima clima))
            {
                IReadOnlyDictionary<string, double> modificadores = clave == "def" ? clima.Defensa
                    : clave == "spd" ? clima.Velocidad : null;
                if (modificadores != null)
                    foreach (string tipo in u.Tipos)
                    {
                        double multiplicador;
                        if (modificadores.TryGetValue(tipo, out multiplicador)) valor *= multiplicador;
                    }
            }
            return valor;
        }

        private void Dano(Unidad objetivo, int cantidad, string motivo = "")
        {
            objetivo.Hp = Math.Max(0, objetivo.Hp - cantidad);
            Registrar("  " + objetivo.Nombre + " pierde " + cantidad + " HP (" + objetivo.Hp + "/" +
                objetivo.MaxHp + ")" + (motivo ?? ""), "", objetivo);
            if (objetivo.Hp == 0 && !objetivo.KO)
            {
                objetivo.KO = true;
                Registrar("  " + objetivo.Nombre + " se debilita", "ko", objetivo);
                if (_perdedor == objetivo.Lado)
                    Registrar(NombreJugador(objetivo.Lado) + ": ¡Resistan, todavía no termina!", "t");
            }
            if (objetivo.Hp > 0) ComprobarBajoVida(objetivo);
        }

        private void ComprobarBajoVida(Unidad u)
        {
            for (int i = 0; i < u.Ab.Count; i++)
            {
                Efecto efecto = u.Ab[i];
                if (efecto.Clave != "low" || u.KO || u.BajoVida.ContainsKey(i)) continue;
                if (u.Hp / (double)u.MaxHp * 100 > efecto.Numero("pct")) continue;
                u.BajoVida[i] = true;
                Registrar("  Habilidad de " + u.Nombre + ": poca vida");
                Boost(u, efecto.Texto("s"), efecto.Numero("n"));
            }
        }

        private void Boost(Unidad u, string stat, double cantidad)
        {
            int n = (int)cantidad;
            string clave = stat.ToUpperInvariant();
            int anterior;
            if (!u.Bo.TryGetValue(clave, out anterior)) anterior = 0;
            int nuevo = Math.Max(-4, Math.Min(4, anterior + n));
            if (nuevo == anterior)
            {
                Registrar("  " + u.Nombre + ": " + stat + " no puede " + (n > 0 ? "subir" : "bajar"));
                return;
            }
            u.Bo[clave] = nuevo;
            Registrar("  " + u.Nombre + ": " + stat + " " + (n > 0 ? "+" : "") + n +
                " → nivel " + nuevo + " (×" + TextosCombate.Num(Reglas.MultiplicadorBoost(nuevo)) + ")");
        }

        private List<Unidad> EquipoObjetivo(Unidad u, int lado, string modo, string objetivo)
        {
            var vivos = Vivos(lado);
            if (modo == "team") return vivos.ToList();
            if (modo == "allies") return vivos.Where(x => x != u).ToList();
            int[] partes = (objetivo ?? "0:0").Split(':').Select(int.Parse).ToArray();
            Unidad candidato = partes[0] == lado && partes[0] >= 0 && partes[0] < 2 &&
                partes[1] >= 0 && partes[1] < _equipos[partes[0]].Count
                ? _equipos[partes[0]][partes[1]] : null;
            if (candidato != null && !candidato.KO && candidato != u && _activos[lado].Contains(partes[1]))
                return new List<Unidad> { u, candidato };
            return new List<Unidad> { u };
        }

        private void AplicarEfectos(Unidad u, Ataque m, IReadOnlyList<Unidad> impactados,
            int infligido, int lado, string objetivo)
        {
            foreach (Efecto efecto in m.Efectos.Where(f => f.Clave == "guard"))
            {
                if (_rng.Siguiente() * 100 >= efecto.Numero("p")) continue;
                List<Unidad> objetivoGuardia;
                if (efecto.Texto("t") == "team")
                    objetivoGuardia = Vivos(lado).ToList();
                else
                {
                    int[] partes = (objetivo ?? "0:0").Split(':').Select(int.Parse).ToArray();
                    Unidad elegida = partes[0] == lado && partes[1] >= 0 && partes[1] < _equipos[partes[0]].Count
                        ? _equipos[partes[0]][partes[1]] : null;
                    objetivoGuardia = new List<Unidad> { elegida != null && !elegida.KO ? elegida : u };
                }
                foreach (Unidad t in objetivoGuardia)
                {
                    t.Guardias.Add(new Guardia(Math.Min(100, efecto.Numero("v")),
                        string.IsNullOrEmpty(efecto.Texto("d")) ? "all" : efecto.Texto("d")));
                    Registrar("  " + t.Nombre + " recibe " + TextosCombate.Num(efecto.Numero("v")) +
                        "% menos de daño (" + TextosCombate.Reduccion(efecto.Texto("d", "all")) + ") este turno");
                }
            }

            foreach (Efecto f in m.Efectos)
            {
                if (f.Clave == "guard" || f.Clave == "pivot" ||
                    (f.Clave == "boost" && f.Texto("s") == "HP")) continue;

                bool propio = (f.Clave == "boost" && f.Texto("t") == "user") ||
                              f.Clave == "lifesteal" || f.Clave == "recoil";
                List<Unidad> grupo = f.Clave == "boost" && new[] { "team", "allies", "ua" }.Contains(f.Texto("t"))
                    ? EquipoObjetivo(u, lado, f.Texto("t"), objetivo) : null;
                IEnumerable<Unidad> destinos = grupo ?? (propio ? new List<Unidad> { u } : impactados);

                foreach (Unidad t in destinos.ToList())
                {
                    if (t.KO) continue;
                    if (t != u && t.Protegido && grupo == null)
                    {
                        Registrar("  " + t.Nombre + " está protegido: ignora " + TextosCombate.Efecto(f.Clave));
                        continue;
                    }
                    if (_rng.Siguiente() * 100 >= f.Numero("p"))
                    {
                        Registrar("  (" + TextosCombate.Efecto(f.Clave) + " " + TextosCombate.Num(f.Numero("p")) +
                            "%: no se activa)", "calc");
                        continue;
                    }

                    switch (f.Clave)
                    {
                        case "boost":
                            Boost(t, f.Texto("s"), f.Numero("n"));
                            break;
                        case "trap":
                            if (t.Trampa > 0) { Registrar("  " + t.Nombre + " ya está atrapado"); break; }
                            t.Trampa = f.Entero("turns");
                            t.TrampaNueva = true;
                            Registrar("  " + t.Nombre + " queda atrapado: no podrá retirarse durante " +
                                t.Trampa + " turnos");
                            break;
                        case "status":
                            string estado = Reglas.AliasEstados.ContainsKey(f.Texto("e")) ? Reglas.AliasEstados[f.Texto("e")] : f.Texto("e");
                            if (!Reglas.Estados.ContainsKey(estado)) { Registrar("  Estado desconocido: " + estado); break; }
                            if (t.Estado != null) { Registrar("  " + t.Nombre + " ya tiene " + t.Estado); break; }
                            t.Estado = estado;
                            Registrar("  " + t.Nombre + " sufre " + estado);
                            break;
                        case "mpsteal":
                            int cantidad;
                            if (f.Texto("m") == "dmg")
                                cantidad = Math.Min(t.Mp, Math.Min((int)Math.Floor(t.Real * f.Numero("v") / 100), f.Entero("c", 50)));
                            else if (f.Texto("m") == "pct")
                                cantidad = Math.Min(t.Mp, (int)Math.Floor(t.Mp * f.Numero("v") / 100));
                            else
                                cantidad = Math.Min(t.Mp, f.Entero("v"));
                            t.Mp -= cantidad;
                            u.Mp = Math.Min(u.MaxMp, u.Mp + cantidad);
                            Registrar("  " + u.Nombre + " roba " + cantidad + " MP a " + t.Nombre);
                            break;
                        case "lifesteal":
                            int vida = (int)Math.Floor(infligido * f.Numero("v") / 100);
                            u.Hp = Math.Min(u.MaxHp, u.Hp + vida);
                            Registrar("  " + u.Nombre + " recupera " + vida + " HP (robo de vida)");
                            break;
                        case "recoil":
                            int retroceso = (int)Math.Floor((f.Texto("b") == "hp" ? u.MaxHp : infligido) * f.Numero("v") / 100);
                            if (retroceso > 0) Dano(u, retroceso, " (retroceso)");
                            break;
                    }
                }
            }
        }

        private CalculoDanio Hit(Unidad u, Unidad t, Ataque m, double multiplicador, bool critico)
        {
            bool fisico = m.Categoria == "fis";
            double ataque = Eff(u, fisico ? "atk" : "matk");
            double defensa = Eff(t, fisico ? "def" : "mdef", critico);
            double baseDanio = (u.Nivel + 5) * Math.Sqrt(ataque / defensa) * (m.Potencia + 30) / 15 + 1;
            bool stab = u.Tipos.Contains(m.Tipo);
            double bonus = 1 + (critico ? 0.5 : 0) + (stab ? 0.3 : 0);

            double tipo = 1;
            foreach (string defensorTipo in t.Tipos) tipo *= _catalogo.Tabla.Multiplicador(m.Tipo, defensorTipo);
            t.TiposEfectividad = tipo;

            double clima = 1;
            if (!string.IsNullOrEmpty(_clima) && Reglas.Climas.TryGetValue(_clima, out Clima c) &&
                c.Dano.ContainsKey(m.Tipo)) clima = c.Dano[m.Tipo];

            Dictionary<string, double> ofensivo;
            double objeto = 1;
            if (!string.IsNullOrEmpty(u.Ofensivo) && Reglas.ObjetosOfensivos.TryGetValue(u.Ofensivo, out ofensivo))
            {
                objeto = (ofensivo.ContainsKey("all") ? ofensivo["all"] : 1) *
                         (ofensivo.ContainsKey(m.Categoria) ? ofensivo[m.Categoria] : 1);
            }

            double guardia = t.Protegido && t.Gl > 0 && t.Gl <= Reglas.ReduccionGuardia.Length
                ? Reglas.ReduccionGuardia[t.Gl - 1] : 1;

            double poder = 1, habilidad = 1;
            foreach (Efecto f in t.Ab)
            {
                if (f.Clave == "cut" && f.Texto("c") == m.Categoria)
                    habilidad *= 1 - f.Numero("v") / 100;
                else if (f.Texto("tipo") == m.Tipo)
                {
                    if (f.Clave == "imm") habilidad = 0;
                    else if (f.Clave == "res") habilidad *= f.Numero("m", 1);
                }
            }
            foreach (Efecto f in u.Ab)
                if (f.Clave == "pow" && f.Texto("tipo") == m.Tipo) poder *= f.Numero("m", 1);

            double reduccion = 0;
            var reducciones = t.Guardias.Where(g => g.Tipo == "all" || g.Tipo == m.Categoria ||
                (g.Tipo == "cont" && m.Contacto) || (g.Tipo == "area" && m.Alcance == "area"))
                .Select(g => g.Valor).ToList();
            if (reducciones.Count > 0) reduccion = Math.Min(100, Math.Max(0, reducciones.Max()));

            int dano = tipo == 0 || habilidad == 0 ? 0 : Math.Max(1, (int)Math.Floor(
                baseDanio * bonus * tipo * clima * objeto * guardia * multiplicador * poder * habilidad *
                (1 - reduccion / 100)));

            var calculo = new CalculoDanio
            {
                Turno = _numeroTurno, Atacante = u.Nombre, Defensor = t.Nombre, Movimiento = m.Nombre,
                Nivel = u.Nivel, Potencia = m.Potencia, Fisico = fisico, Ataque = ataque, Defensa = defensa,
                Critico = critico, Stab = stab, Bonus = bonus, Tipo = tipo, Clima = clima, Objeto = objeto,
                Guardia = guardia, Poder = poder, Habilidad = habilidad, Reduccion = reduccion,
                Multiplicador = multiplicador, Base = baseDanio, Danio = dano
            };
            _calculos.Add(calculo);

            string DetalleBonus = (critico ? "crítico +50%" : "") + (critico && stab ? " y " : "") +
                (stab ? "STAB +30%" : "") + (!critico && !stab ? "ninguno" : "");
            Registrar("  Cálculo " + t.Nombre + ": base " + TextosCombate.Fijo(baseDanio, 1) +
                " [((" + u.Nivel + "+5)·√(" + TextosCombate.Num(EvaluadorFormulas.RedondearJs(ataque)) + "/" +
                TextosCombate.Num(EvaluadorFormulas.RedondearJs(defensa)) + (critico ? " defensa base" : "") +
                ")·(" + TextosCombate.Num(m.Potencia) + "+30))/15+1] × bonus " +
                TextosCombate.NumRedondeado(bonus, 2) + " (" + DetalleBonus + ") × tipo " +
                TextosCombate.Num(tipo) + " × clima " + TextosCombate.Num(clima) + " × objeto " +
                TextosCombate.Fijo(objeto, 2) + (t.Protegido ? " × Guardia " + TextosCombate.Num(guardia) : "") +
                (reduccion != 0 ? " × Reducción " + TextosCombate.Num(reduccion) + "%" : "") +
                (multiplicador != 1 ? " × " + TextosCombate.Num(multiplicador) : "") +
                (poder * habilidad != 1 ? " × habilidad " +
                    TextosCombate.NumRedondeado(poder * habilidad, 3) : "") + " = " + dano +
                (tipo > 1 ? " (¡Súper eficaz!)" : tipo > 0 && tipo < 1 ? " (Poco eficaz)" : ""), "calc", t);
            return calculo;
        }

        private void Reacciones(Unidad u, Unidad t, int dano, Ataque m)
        {
            foreach (Efecto f in t.Ab)
            {
                if (f.Clave != "ref" && f.Clave != "stt" && !(f.Clave == "trap" && f.Texto("w") != "enter"))
                    continue;
                string cuando = f.Texto("w", "any");
                if ((cuando == "fis" && m.Categoria != "fis") || (cuando == "mag" && m.Categoria != "mag") ||
                    (cuando == "cont" && !(m.Categoria == "fis" && m.Contacto)) ||
                    (cuando == "muerte" && !t.KO)) continue;
                if (u.KO || u == t) continue;

                if (f.Clave == "trap")
                {
                    if (u.Protegido) { Registrar("  " + u.Nombre + " está protegido: ignora la trampa de " + t.Nombre); continue; }
                    if (_rng.Siguiente() * 100 >= f.Numero("p")) continue;
                    if (u.Trampa > 0) { Registrar("  " + u.Nombre + " ya está atrapado"); continue; }
                    u.Trampa = f.Entero("turns");
                    u.TrampaNueva = true;
                    Registrar("  Habilidad de " + t.Nombre + ": " + u.Nombre + " no podrá retirarse durante " +
                        u.Trampa + " turnos");
                }
                else if (f.Clave == "ref")
                {
                    int cantidad = (int)Math.Floor((f.Texto("b") == "hp" ? u.MaxHp : dano) * f.Numero("v") / 100);
                    if (cantidad > 0) Dano(u, cantidad, " (daño devuelto por " + t.Nombre + ")");
                }
                else
                {
                    if (u.Protegido)
                    {
                        Registrar("  " + u.Nombre + " está protegido: ignora " + f.Texto("e") + " de " + t.Nombre);
                        continue;
                    }
                    if (_rng.Siguiente() * 100 >= f.Numero("p")) continue;
                    string estado = Reglas.AliasEstados.ContainsKey(f.Texto("e")) ? Reglas.AliasEstados[f.Texto("e")] : f.Texto("e");
                    if (!Reglas.Estados.ContainsKey(estado)) continue;
                    if (u.Estado != null) { Registrar("  " + u.Nombre + " ya tiene " + u.Estado); continue; }
                    u.Estado = estado;
                    Registrar("  Habilidad de " + t.Nombre + ": " + u.Nombre + " sufre " + estado);
                }
            }
        }

        private void MensajeEficacia(Unidad t)
        {
            if (t.TiposEfectividad > 1) Registrar("  ¡Es súper eficaz!", "eff+", t);
            else if (t.TiposEfectividad > 0 && t.TiposEfectividad < 1) Registrar("  No es muy eficaz…", "eff-", t);
        }

        private void HacerAtaque(Turno turno)
        {
            Unidad u = turno.U;
            Ataque m = turno.A.MovimientoId == Desesperacion.Id && PuedeAtacar(u)
                ? null
                : u.Movimientos.FirstOrDefault(x => x.Id == turno.A.MovimientoId);
            if (m == null && turno.A.MovimientoId == Desesperacion.Id) m = Desesperacion;
            if (m == null) { Registrar("  " + u.Nombre + " no tiene ataque elegido"); return; }

            if (u.Estado == "Parálisis" && _rng.Siguiente() < 0.2)
            {
                Registrar("  " + u.Nombre + " está paralizado y no puede moverse");
                return;
            }
            int coste = Coste(u, m);
            if (u.Mp < coste)
            {
                Registrar("  " + u.Nombre + " no tiene maná para " + m.Nombre + " (" + u.Mp + "/" + coste + " MP)");
                return;
            }
            u.Mp -= coste;
            u.Primero = false;

            var rivales = Vivos(1 - u.Lado);
            foreach (Unidad rival in rivales) rival.Real = 0;
            List<Unidad> objetivos;
            if (m.Alcance == "area")
                objetivos = rivales.ToList();
            else
            {
                Unidad elegido = ElegirObjetivo(rivales, turno.A.Objetivo);
                objetivos = elegido == null ? new List<Unidad>() : new List<Unidad> { elegido };
            }

            Registrar(u.Nombre + " (" + NombreJugador(u.Lado) + ") usa " + m.Nombre + " [" + m.Tipo + " · " +
                TextosCombate.Categoria(m.Categoria) + (m.Contacto ? " contacto" : "") + " · " + coste + " MP" +
                (coste < m.Mp ? " (−10% por STAB)" : "") + "]");
            if (objetivos.Count == 0) { Registrar("  Sin objetivo válido"); return; }
            foreach (Unidad t in objetivos) if (t.Protegido) t.Gmp += coste;

            List<Unidad> impactados = objetivos.ToList();
            int infligido = 0;
            if (m.Categoria != "est")
            {
                double multiplicadorArea = objetivos.Count > 1 ? m.Aoe / 100 : 1;
                impactados = new List<Unidad>();
                foreach (Unidad t in objetivos)
                {
                    bool critico = _rng.Siguiente() * 100 < m.ProbabilidadCritico;
                    CalculoDanio calculo = Hit(u, t, m, multiplicadorArea, critico);
                    if (calculo.Danio > 0)
                    {
                        if (critico) Registrar("  ¡Golpe crítico!", "crit", t);
                        infligido += calculo.Danio;
                        impactados.Add(t);
                        t.Real += Math.Min(calculo.Danio, t.Hp);
                        MensajeEficacia(t);
                        Dano(t, calculo.Danio);
                        Reacciones(u, t, calculo.Danio, m);
                    }
                    else Registrar("  No afecta a " + t.Nombre, "eff0", t);
                }

                if (m.Alcance == "uni" && m.Rebotes.Count > 0)
                {
                    var reserva = rivales.Where(t => !objetivos.Contains(t) && !t.KO).ToList();
                    for (int i = 0; i < m.Rebotes.Count; i++)
                    {
                        if (reserva.Count == 0) break;
                        Unidad t = reserva[(int)Math.Floor(_rng.Siguiente() * reserva.Count)];
                        reserva.Remove(t);
                        Registrar("  Rebote " + (i + 1) + " (" + TextosCombate.Num(m.Rebotes[i]) + "%) sobre " + t.Nombre);
                        bool critico = _rng.Siguiente() * 100 < m.ProbabilidadCritico;
                        CalculoDanio calculo = Hit(u, t, m, m.Rebotes[i] / 100, critico);
                        if (calculo.Danio > 0)
                        {
                            if (critico) Registrar("  ¡Golpe crítico!", "crit", t);
                            infligido += calculo.Danio;
                            impactados.Add(t);
                            t.Real += Math.Min(calculo.Danio, t.Hp);
                            MensajeEficacia(t);
                            Dano(t, calculo.Danio);
                            Reacciones(u, t, calculo.Danio, m);
                        }
                    }
                }
            }

            AplicarEfectos(u, m, impactados, infligido, u.Lado, turno.A.Objetivo);
            Efecto pivote = m.Efectos.FirstOrDefault(f => f.Clave == "pivot");
            if (pivote != null && !u.KO && (m.Categoria == "est" || impactados.Count > 0) &&
                _rng.Siguiente() * 100 < pivote.Numero("p"))
                HacerPivote(u, u.Lado, turno.A, pivote);
        }

        private bool PuedeAtacar(Unidad u) => u.Movimientos.Any(m => Coste(u, m) <= u.Mp);

        private Unidad ElegirObjetivo(IReadOnlyList<Unidad> rivales, string objetivo)
        {
            string[] partes = (objetivo ?? "0:0").Split(':');
            int lado = int.Parse(partes[0]), indice = int.Parse(partes[1]);
            Unidad elegido = null;
            if (lado >= 0 && lado < 2 && indice >= 0 && indice < _equipos[lado].Count)
            {
                Unidad candidato = _equipos[lado][indice];
                if (!candidato.KO && _activos[lado].Contains(indice)) elegido = candidato;
            }
            if (elegido == null && rivales.Count > 0)
                elegido = rivales[(int)Math.Floor(_rng.Siguiente() * rivales.Count)];
            return elegido;
        }

        private void HacerPivote(Unidad u, int lado, Accion accion, Efecto pivote)
        {
            if (u.Trampa > 0) { Registrar("  " + u.Nombre + " está atrapado y no puede salir (pivote bloqueado)"); return; }
            int indice = int.Parse(string.IsNullOrEmpty(accion.Pivote) ? "-1" : accion.Pivote);
            Unidad siguiente = indice >= 0 && indice < _equipos[lado].Count ? _equipos[lado][indice] : null;
            int pos = Array.IndexOf(_activos[lado], u.Indice);
            if (siguiente == null || siguiente.KO || _activos[lado].Contains(indice) || pos < 0)
            {
                Registrar("  " + u.Nombre + ": pivote sin reemplazo válido");
                return;
            }
            bool conserva = pivote.Texto("keep") == "1";
            if (!conserva)
            {
                foreach (string clave in u.Bo.Keys.ToList()) u.Bo[clave] = 0;
                u.MaxHp = u.BaseVida;
                u.Hp = Math.Min(u.Hp, u.MaxHp);
            }
            siguiente.Primero = true;
            _activos[lado][pos] = indice;
            Registrar("  PIVOTE: " + u.Nombre + " sale y entra " + siguiente.Nombre +
                " (" + (conserva ? "conserva" : "pierde") + " sus boosteos)");
            Entrar(siguiente);
        }

        private void Entrar(Unidad u)
        {
            foreach (Efecto f in u.Ab)
            {
                if (f.Clave == "wea" && Reglas.Climas.ContainsKey(f.Texto("w")) && _clima != f.Texto("w"))
                {
                    _clima = f.Texto("w");
                    Registrar(u.Nombre + " (" + u.HabilidadNombre + ") invoca " + Reglas.Climas[_clima].Nombre, "t");
                }
                if (f.Clave == "trap" && f.Texto("w") == "enter")
                {
                    foreach (Unidad rival in Vivos(1 - u.Lado))
                    {
                        if (rival.Protegido) continue;
                        if (_rng.Siguiente() * 100 >= f.Numero("p")) continue;
                        if (rival.Trampa > 0) continue;
                        rival.Trampa = f.Entero("turns");
                        rival.TrampaNueva = true;
                        Registrar(u.Nombre + " (" + u.HabilidadNombre + ") atrapa a " + rival.Nombre +
                            ": no podrá retirarse durante " + rival.Trampa + " turnos", "t");
                    }
                }
                if (f.Clave == "int" && new[] { "ATK", "DEF", "MATK", "MDEF", "SPD" }.Contains(f.Texto("s").ToUpperInvariant()))
                {
                    int pos = Array.IndexOf(_activos[u.Lado], u.Indice);
                    var rivales = Vivos(1 - u.Lado);
                    List<Unidad> objetivo;
                    if (f.Texto("w") == "front")
                        objetivo = rivales.Where(r => Array.IndexOf(_activos[1 - u.Lado], r.Indice) == pos).ToList();
                    else if (f.Texto("w") == "rand")
                        objetivo = rivales.Count > 0
                            ? new List<Unidad> { rivales[(int)Math.Floor(_rng.Siguiente() * rivales.Count)] }
                            : new List<Unidad>();
                    else objetivo = rivales.ToList();

                    Registrar(u.Nombre + " (" + u.HabilidadNombre + ") reduce " + f.Texto("s") + " rival al entrar", "t");
                    if (objetivo.Count == 0) Registrar("  Sin rival objetivo");
                    foreach (Unidad r in objetivo)
                        Boost(r, f.Texto("s"), -Math.Abs(f.Numero("n", 1)));
                }
            }
        }

        private void HacerCambio(Turno turno)
        {
            Unidad u = turno.U;
            int indice = int.Parse(string.IsNullOrEmpty(turno.A.CambioIndice) ? "-1" : turno.A.CambioIndice);
            Unidad siguiente = indice >= 0 && indice < _equipos[u.Lado].Count ? _equipos[u.Lado][indice] : null;
            if (u.Trampa > 0)
            {
                Registrar(u.Nombre + " está atrapado (" + u.Trampa + " turno(s)) y no puede ser retirado");
                return;
            }
            if (siguiente == null || siguiente.KO || _activos[u.Lado].Contains(indice))
            {
                Registrar(u.Nombre + " no puede cambiarse (sin reemplazo válido)");
                return;
            }
            foreach (string clave in u.Bo.Keys.ToList()) u.Bo[clave] = 0;
            u.MaxHp = u.BaseVida;
            u.Hp = Math.Min(u.Hp, u.MaxHp);
            siguiente.Primero = true;
            _activos[u.Lado][turno.Pos] = indice;
            Registrar(NombreJugador(u.Lado) + ": ¡" + u.Nombre + ", regresa! " + TextoAnimo(u.Lado, siguiente.Nombre), "t");
            Entrar(siguiente);
        }

        private void HacerObjeto(Turno turno)
        {
            Unidad u = turno.U;
            string nombre = turno.A.Objeto;
            Unidad objetivo = null;
            int indice = int.Parse(string.IsNullOrEmpty(turno.A.IndiceObjetivo) ? "-1" : turno.A.IndiceObjetivo);
            if (indice >= 0 && indice < _equipos[u.Lado].Count) objetivo = _equipos[u.Lado][indice];
            if (nombre == null || !_mochila[u.Lado].ContainsKey(nombre) || _mochila[u.Lado][nombre] <= 0 ||
                objetivo == null || objetivo.KO)
            {
                Registrar(u.Nombre + " no puede usar " + (nombre ?? "objeto"));
                return;
            }
            _mochila[u.Lado][nombre]--;
            Objeto objeto = _catalogo.Objetos.FirstOrDefault(o => o.Nombre == nombre);
            string tipo = objeto == null ? nombre == "Poción" ? "hp" : nombre == "Éter" ? "mp" : "cura" : objeto.TipoEfecto;
            double potencia = objeto == null ? 30 : objeto.Potencia;
            if (tipo == "hp")
            {
                int cura = Math.Min(objetivo.MaxHp - objetivo.Hp, (int)Math.Floor(objetivo.MaxHp * potencia / 100));
                objetivo.Hp += cura;
                Registrar(u.Nombre + " usa " + nombre + " en " + objetivo.Nombre + ": +" + cura + " HP");
            }
            else if (tipo == "mp")
            {
                int cura = Math.Min(objetivo.MaxMp - objetivo.Mp, (int)Math.Floor(objetivo.MaxMp * potencia / 100));
                objetivo.Mp += cura;
                Registrar(u.Nombre + " usa " + nombre + " en " + objetivo.Nombre + ": +" + cura + " MP");
            }
            else if (tipo == "cura")
            {
                Registrar(u.Nombre + " usa " + nombre + " en " + objetivo.Nombre + ": " +
                    (objetivo.Estado != null ? "cura " + objetivo.Estado : "sin efecto"));
                objetivo.Estado = null;
            }
            else Registrar(u.Nombre + " usa " + nombre + " en " + objetivo.Nombre + ": sin efecto");
        }

        private void HacerGuardia(Turno turno)
        {
            Unidad u = turno.U;
            u.Gc++;
            u.Gl = u.Gc;
            u.Protegido = true;
            if (u.Gc >= 3) u.Cd = 1;
            Registrar(u.Nombre + " se pone en guardia (nivel " + u.Gc + ": −" +
                new[] { 90, 50, 20 }[Math.Min(2, u.Gc - 1)] + "% de daño recibido" +
                (u.Gc >= 3 ? "; no podrá guardia el próximo turno" : "") + ")");
        }

        private void HacerRecuperacion(Turno turno)
        {
            turno.U.Recuperando = true;
            Registrar(turno.U.Nombre + " se concentra en recuperar maná y queda vulnerable");
        }

        private void HacerEmergencia(Turno turno)
        {
            Unidad u = turno.U;
            Unidad objetivo = ElegirObjetivo(Vivos(1 - u.Lado), turno.A.Objetivo);
            if (objetivo == null) return;
            u.Primero = false;
            Registrar(u.Nombre + " (J" + (u.Lado + 1) + ") usa ATAQUE DE EMERGENCIA contra " + objetivo.Nombre);
            Dano(u, Math.Max(1, (int)Math.Floor(u.MaxHp * 0.1)), " (coste del ataque de emergencia)");
            Dano(objetivo, Math.Max(1, (int)Math.Floor(objetivo.MaxHp * 0.1 * (objetivo.Protegido ? 0.1 : 1))),
                " (ataque de emergencia)");
        }

        private void FinalizarTurno()
        {
            for (int lado = 0; lado < 2; lado++)
                foreach (int ti in _activos[lado])
                {
                    Unidad u = _equipos[lado][ti];
                    if (u.Trampa <= 0) continue;
                    if (u.TrampaNueva) u.TrampaNueva = false;
                    else
                    {
                        u.Trampa--;
                        if (u.Trampa == 0) Registrar(u.Nombre + " ya puede retirarse", "calc");
                    }
                }

            for (int lado = 0; lado < 2; lado++)
                foreach (int ti in _activos[lado])
                {
                    Unidad u = _equipos[lado][ti];
                    if (_clima == "ob" && !u.Tipos.Contains("Tierra"))
                        Dano(u, Math.Max(1, (int)Math.Floor(u.MaxHp * 0.05)), " (Tormenta de Obsidiana)");
                    Dictionary<string, double> estado;
                    if (!u.KO && u.Estado != null && Reglas.Estados.TryGetValue(u.Estado, out estado))
                    {
                        double tick;
                        if (estado.TryGetValue("tick", out tick))
                            Dano(u, Math.Max(1, (int)Math.Floor(u.MaxHp * tick)), " (" + u.Estado + ")");
                    }
                }

            for (int lado = 0; lado < 2; lado++)
                foreach (int ti in _activos[lado])
                {
                    Unidad u = _equipos[lado][ti];
                    if (u.KO) continue;
                    if (u.Recuperando)
                    {
                        int ganancia = u.MaxMp - u.Mp;
                        u.Mp = u.MaxMp;
                        u.Recuperando = false;
                        Registrar(u.Nombre + " sobrevive y recupera todo su maná (+" + ganancia + " MP)");
                    }
                    else if (u.Protegido && u.Gmp > 0)
                    {
                        int ganancia = Math.Min(u.MaxMp - u.Mp, (int)Math.Floor(u.Gmp * 0.1));
                        u.Mp += ganancia;
                        Registrar(u.Nombre + " recupera " + ganancia + " MP por los ataques bloqueados (10% de " +
                            u.Gmp + " MP)");
                    }
                }

            for (int lado = 0; lado < 2; lado++)
                for (int pos = 0; pos < _activos[lado].Length; pos++)
                {
                    if (!_equipos[lado][_activos[lado][pos]].KO) continue;
                    int sustituto = _equipos[lado].FindIndex(u => !u.KO && !_activos[lado].Contains(u.Indice));
                    if (sustituto < 0) continue;
                    _activos[lado][pos] = sustituto;
                    Registrar(NombreJugador(lado) + ": " + TextoAnimo(lado, _equipos[lado][sustituto].Nombre), "t");
                    Entrar(_equipos[lado][sustituto]);
                }
            ComprobarFin();
        }

        private string TextoAnimo(int lado, string nombre)
        {
            if (_perdedor != lado) return "¡Adelante, " + nombre + "!";
            string[] frases =
            {
                "¡Ánimo, " + nombre + "! ¡Tú puedes!",
                "¡Todo depende de ti, " + nombre + "!",
                "¡" + nombre + ", aún no termina! ¡Con todo!"
            };
            return frases[(_numeroTurno + nombre.Length) % 3];
        }

        private void ComprobarFin()
        {
            if (_terminado) return;
            if (_perdedor == null)
            {
                int? perdedor = FinalCercano();
                _perdedor = perdedor;
                if (perdedor != null)
                    Registrar("¡El combate se acerca a su final! " + NombreJugador(perdedor.Value) + " está contra las cuerdas", "t");
            }
            bool[] derrotados = { _equipos[0].All(u => u.KO), _equipos[1].All(u => u.KO) };
            if (derrotados[0] && derrotados[1])
            {
                _terminado = true;
                Registrar("¡Empate! Ambos equipos quedaron sin criaturas", "t");
            }
            else if (derrotados[0] || derrotados[1])
            {
                _terminado = true;
                Registrar("¡Gana " + NombreJugador(derrotados[0] ? 1 : 0) + "!", "t");
            }
        }

        private int? FinalCercano()
        {
            var candidatos = new List<int>();
            for (int lado = 0; lado < 2; lado++)
            {
                var equipo = _equipos[lado];
                int vivos = equipo.Count(u => !u.KO);
                if (vivos > 0 && equipo.Count - vivos >= Math.Floor(equipo.Count / 2.0) &&
                    equipo.Any(u => u.Hp <= u.MaxHp * 0.5))
                    candidatos.Add(lado);
            }
            if (candidatos.Count == 0) return null;
            if (candidatos.Count == 1) return candidatos[0];
            double Fraccion(int lado) => _equipos[lado].Sum(u => u.Hp) / (double)_equipos[lado].Sum(u => u.MaxHp);
            return Fraccion(0) <= Fraccion(1) ? 0 : 1;
        }

        private static Catalogo CatalogoDePrueba(string atacanteId, string defensorId, string ataqueId,
            out Unidad atacante, out Unidad defensor, out Ataque ataque)
        {
            string json = System.IO.File.ReadAllText(System.IO.Path.Combine(
                AppContext.BaseDirectory, "datos_prueba.json"));
            Catalogo catalogo = Datos.CargadorCatalogo.CargarDatosPrueba(json);
            atacante = new Unidad(catalogo, catalogo.ObtenerCriatura(atacanteId), "", "", 0, 0);
            defensor = new Unidad(catalogo, catalogo.ObtenerCriatura(defensorId), "", "", 1, 0);
            ataque = catalogo.ObtenerAtaque(ataqueId);
            return catalogo;
        }

        /// <summary>Calcula un golpe aislado con la semilla y los parámetros del vector de daño.</summary>
        public static CalculoDanio CalcularDanioPrueba(string atacanteId, string defensorId, string ataqueId,
            double multiplicador, bool critico, string semilla)
        {
            Unidad atacante, defensor;
            Ataque ataque;
            CatalogoDePrueba(atacanteId, defensorId, ataqueId, out atacante, out defensor, out ataque);
            var batalla = new Batalla(atacante.Criatura == null ? null : CargadorDePrueba(), Formato.Laboratorio, semilla);
            batalla._numeroTurno = 1;
            batalla._captura = new List<EventoCombate>();
            try { return batalla.Hit(atacante, defensor, ataque, multiplicador, critico); }
            finally { batalla._captura = null; }
        }

        private static Catalogo CargadorDePrueba()
        {
            string json = System.IO.File.ReadAllText(System.IO.Path.Combine(
                AppContext.BaseDirectory, "datos_prueba.json"));
            return Datos.CargadorCatalogo.CargarDatosPrueba(json);
        }

        /// <summary>Aplica los efectos de un ataque aislado con la semilla del vector de efectos.</summary>
        public static ResultadoEfectos AplicarEfectosPrueba(string ataqueId, string semilla)
        {
            Unidad atacante, defensor;
            Ataque ataque;
            Catalogo catalogo = CatalogoDePrueba("c_tonatiuh", "c_quetzal", ataqueId,
                out atacante, out defensor, out ataque);
            atacante.Hp = (int)Math.Floor(atacante.MaxHp * 0.6);
            defensor.Hp = (int)Math.Floor(defensor.MaxHp * 0.8);
            defensor.Real = 100;

            var batalla = new Batalla(catalogo, Formato.Laboratorio, semilla);
            var captura = new List<EventoCombate>();
            batalla._captura = captura;
            try { batalla.AplicarEfectos(atacante, ataque, new List<Unidad> { defensor }, 100, 0, "1:0"); }
            finally { batalla._captura = null; }

            return new ResultadoEfectos
            {
                Eventos = captura.Select(e => e.Mensaje).ToList(),
                Atacante = EstadoEfectos(atacante),
                Defensor = EstadoEfectos(defensor)
            };
        }

        private static UnidadEfectos EstadoEfectos(Unidad u) => new UnidadEfectos
        {
            Hp = u.Hp,
            Mp = u.Mp,
            Status = u.Estado,
            Trap = u.Trampa,
            Bo = u.CopiaBoosts(),
            Guards = u.Guardias
        };
    }
}
