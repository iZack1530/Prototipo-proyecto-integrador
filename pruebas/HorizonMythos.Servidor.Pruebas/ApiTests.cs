using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using HorizonMythos.Servidor.Persistencia;
using HorizonMythos.Servidor.Servicios;
using Microsoft.Extensions.DependencyInjection;

namespace HorizonMythos.Servidor.Pruebas;

public sealed class ApiTests
{
    [Fact]
    public async Task Catalogo_ExponeLosDatosDelNucleo()
    {
        using var fabrica = new FabricaServidor();
        using HttpClient cliente = fabrica.CreateClient();

        JsonElement catalogo = await cliente.GetFromJsonAsync<JsonElement>("/api/catalogo");
        Assert.Equal(12, catalogo.GetProperty("criaturas").GetArrayLength());
        Assert.Equal(52, catalogo.GetProperty("ataques").GetArrayLength());
        Assert.Equal(10, catalogo.GetProperty("habilidades").GetArrayLength());
    }

    [Fact]
    public async Task Equipos_RequiereSesionYValidaConElNucleo()
    {
        using var fabrica = new FabricaServidor();
        using HttpClient anonimo = fabrica.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonimo.GetAsync("/api/equipos")).StatusCode);

        using HttpClient cliente = await fabrica.ClienteAutenticadoAsync("equipos");
        var catalogo = fabrica.Services.GetRequiredService<CatalogoServicio>();
        string[] equipo = catalogo.Catalogo.Criaturas.Take(3).Select(c => c.Id).ToArray();

        HttpResponseMessage creado = await cliente.PostAsJsonAsync("/api/equipos", new
        {
            nombre = "Equipo de prueba",
            formato = "3v3",
            criaturas = equipo
        });
        Assert.Equal(HttpStatusCode.Created, creado.StatusCode);

        HttpResponseMessage invalido = await cliente.PostAsJsonAsync("/api/equipos", new
        {
            nombre = "Equipo corto",
            formato = "3v3",
            criaturas = equipo.Take(1).ToArray()
        });
        Assert.Equal(HttpStatusCode.BadRequest, invalido.StatusCode);

        JsonElement lista = await cliente.GetFromJsonAsync<JsonElement>("/api/equipos");
        Assert.Equal(1, lista.GetArrayLength());
        string id = lista[0].GetProperty("id").GetString() ?? "";

        Assert.Equal(HttpStatusCode.NoContent,
            (await cliente.DeleteAsync($"/api/equipos/{id}")).StatusCode);
    }

    [Fact]
    public async Task RepeticionesYCombates_RespondenSinDatos()
    {
        using var fabrica = new FabricaServidor();
        using HttpClient cliente = fabrica.CreateClient();

        Assert.Equal(HttpStatusCode.NotFound, (await cliente.GetAsync("/api/repeticiones/no-existe")).StatusCode);

        JsonElement activos = await cliente.GetFromJsonAsync<JsonElement>("/api/combates/activos");
        Assert.Equal(JsonValueKind.Array, activos.ValueKind);
        Assert.Equal(0, activos.GetArrayLength());
    }

    [Fact]
    public async Task Galeria_ListaYSubeObraConAutor()
    {
        using var fabrica = new FabricaServidor();
        using HttpClient cliente = await fabrica.ClienteAutenticadoAsync("galeria");

        JsonElement vacia = await cliente.GetFromJsonAsync<JsonElement>("/api/galeria");
        Assert.Equal(0, vacia.GetArrayLength());

        using var contenido = new MultipartFormDataContent();
        contenido.Add(new StringContent("Guardián del amanecer"), "titulo");
        contenido.Add(new StringContent("equipo-i2"), "artista");
        contenido.Add(new StringContent("2026-01-01"), "fecha");
        contenido.Add(new StringContent("Arte conceptual de prueba"), "descripcion");
        contenido.Add(new StringContent("criatura,concepto"), "etiquetas");
        contenido.Add(new StringContent("c_tonatiuh"), "criaturaRelacionada");
        var imagen = new ByteArrayContent(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 });
        imagen.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        contenido.Add(imagen, "archivo", "obra.png");

        HttpResponseMessage subida = await cliente.PostAsync("/api/galeria", contenido);
        Assert.Equal(HttpStatusCode.Created, subida.StatusCode);

        JsonElement lista = await cliente.GetFromJsonAsync<JsonElement>("/api/galeria");
        Assert.Equal(1, lista.GetArrayLength());
        Assert.Equal("Guardián del amanecer", lista[0].GetProperty("titulo").GetString());
        string url = lista[0].GetProperty("url").GetString() ?? "";
        Assert.True(File.Exists(Path.Combine(fabrica.CarpetaMedios, Path.GetFileName(url))));
    }

    [Fact]
    public async Task Ranking_CambiaTrasRegistrarUnCombate()
    {
        using var fabrica = new FabricaServidor();
        using HttpClient ganador = await fabrica.ClienteAutenticadoAsync("ranking-a");
        using HttpClient perdedor = await fabrica.ClienteAutenticadoAsync("ranking-b");

        Guid idGanador;
        Guid idPerdedor;
        using (IServiceScope ambito = fabrica.Services.CreateScope())
        {
            ContextoBd bd = ambito.ServiceProvider.GetRequiredService<ContextoBd>();
            idGanador = bd.Usuarios.Single(u => u.NombreVisible == "jugador-ranking-a").Id;
            idPerdedor = bd.Usuarios.Single(u => u.NombreVisible == "jugador-ranking-b").Id;

            var servicio = ambito.ServiceProvider.GetRequiredService<ClasificacionServicio>();
            await servicio.RegistrarAsync(idGanador, idPerdedor, "3v3");
        }

        JsonElement ranking = await ganador.GetFromJsonAsync<JsonElement>("/api/ranking?formato=3v3");
        JsonElement tabla = ranking.GetProperty("tabla");
        Assert.Equal(2, tabla.GetArrayLength());
        Assert.True(tabla[0].GetProperty("puntos").GetDouble() > 1000);
        Assert.True(tabla[1].GetProperty("puntos").GetDouble() < 1000);
        Assert.Equal("jugador-ranking-a", tabla[0].GetProperty("nombre").GetString());
    }
}
