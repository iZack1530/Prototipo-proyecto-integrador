using System.Text.Json;
using Microsoft.AspNetCore.SignalR.Client;

namespace HorizonMythos.Servidor.Pruebas;

public sealed class SaludYHubTests
{
    [Fact]
    public async Task Salud_RespondeOk()
    {
        using var fabrica = new FabricaServidor();
        using HttpClient cliente = fabrica.CreateClient();

        HttpResponseMessage respuesta = await cliente.GetAsync("/api/salud");
        respuesta.EnsureSuccessStatusCode();

        using JsonDocument json = JsonDocument.Parse(await respuesta.Content.ReadAsStringAsync());
        Assert.Equal("ok", json.RootElement.GetProperty("estado").GetString());
        Assert.Equal("HorizonMythos.Servidor", json.RootElement.GetProperty("servicio").GetString());
    }

    [Fact]
    public async Task HubCombate_RespondeEcoYNotificaConexion()
    {
        using var fabrica = new FabricaServidor();
        var conectado = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);

        await using HubConnection conexion = await FabricaServidor.ConectarHubAsync(fabrica);
        conexion.On<JsonElement>("Conectado", carga =>
            conectado.TrySetResult(carga.GetProperty("conexionId").GetString() ?? ""));

        string eco = await conexion.InvokeAsync<string>("Eco", "hola");
        Assert.Equal("eco: hola", eco);

        string conexionId = await conectado.Task.WaitAsync(TimeSpan.FromSeconds(10));
        Assert.False(string.IsNullOrWhiteSpace(conexionId));
    }
}
