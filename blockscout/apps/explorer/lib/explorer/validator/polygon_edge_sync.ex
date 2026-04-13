defmodule Explorer.Validator.PolygonEdgeSync do
  use GenServer

  alias Explorer.Chain.Validator
  alias Explorer.Repo
  alias Explorer.SmartContract.Reader

  @staking_contract "0x0000000000000000000000000000000000001001"
  @sync_interval :timer.minutes(1)

  def start_link(_) do
    GenServer.start_link(__MODULE__, :ok, name: __MODULE__)
  end

  @impl true
  def init(args) do
    send(self(), :sync)
    {:ok, args}
  end

  @impl true
  def handle_info(:sync, state) do
    sync_validators()
    Process.send_after(self(), :sync, @sync_interval)
    {:noreply, state}
  end

  def sync_validators do
    case fetch_validators_from_chain() do
      {:ok, validators} ->
        update_validators_in_db(validators)

      error ->
        IO.inspect(error, label: "Failed to fetch validators from Polygon Edge contract")
    end
  end

  defp fetch_validators_from_chain do
    # b7ab4db5 = keccak256(getValidators())
    abi = [
      %{
        "constant" => true,
        "inputs" => [],
        "name" => "getValidators",
        "outputs" => [%{"name" => "", "type" => "address[]"}],
        "payable" => false,
        "stateMutability" => "view",
        "type" => "function"
      }
    ]

    params = %{"b7ab4db5" => []}

    case Reader.query_contract(@staking_contract, nil, abi, params, false) do
      %{"b7ab4db5" => {:ok, [validators]}} -> {:ok, validators}
      other -> {:error, other}
    end
  end

  defp update_validators_in_db(validators) do
    Repo.transaction(fn ->
      # Drop existing and re-insert current set
      Validator.drop_all_validators()
      
      Enum.each(validators, fn hash ->
        case Explorer.Chain.Hash.Address.cast(hash) do
          {:ok, address_hash} ->
            Validator.insert_or_update(nil, %{address_hash: address_hash, is_validator: true})
          _ ->
             # fallback for string hashes
             case Explorer.Chain.string_to_address_hash(hash) do
               {:ok, address_hash} ->
                 Validator.insert_or_update(nil, %{address_hash: address_hash, is_validator: true})
               _ -> :ignore
             end
        end
      end)
    end)
  end
end
