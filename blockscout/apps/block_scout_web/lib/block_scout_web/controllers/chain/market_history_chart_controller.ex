defmodule BlockScoutWeb.Chain.MarketHistoryChartController do
  use BlockScoutWeb, :controller

  alias Explorer.{Chain, Market}

  def show(conn, _params) do
    if ajax?(conn) do
      exchange_rate = Market.get_coin_exchange_rate()

      recent_market_history = Market.fetch_recent_history()
      current_total_supply = available_supply(Chain.supply_for_days(), exchange_rate)

      price_history_data =
        case recent_market_history do
          [today | the_rest] when not is_nil(exchange_rate.fiat_value) ->
            [%{today | closing_price: exchange_rate.fiat_value} | the_rest]

          data when is_list(data) ->
            data

          _ ->
            []
        end

      market_history_data = encode_market_history_data(price_history_data, current_total_supply)

      json(conn, %{
        history_data: market_history_data
      })
    else
      unprocessable_entity(conn)
    end
  end

  def available_supply(:ok, exchange_rate), do: exchange_rate.available_supply || 0

  def available_supply({:ok, supply_for_days}, _exchange_rate) do
    supply_for_days
    |> Jason.encode()
    |> case do
      {:ok, _data} ->
        current_date =
          supply_for_days
          |> Map.keys()
          |> Enum.max(Date)

        Map.get(supply_for_days, current_date)

      _ ->
        nil
    end
  end

  def encode_market_history_data(_market_history_data, nil), do: []

  def encode_market_history_data(market_history_data, current_total_supply) when is_binary(current_total_supply) do
    encode_market_history_data(market_history_data, Decimal.new(current_total_supply))
  end

  def encode_market_history_data(market_history_data, current_total_supply) do
    market_history_data
    |> Enum.map(fn day ->
      market_cap =
        cond do
          day.market_cap -> day.market_cap
          not is_nil(day.closing_price) -> Decimal.mult(current_total_supply, day.closing_price)
          true -> nil
        end

      day
      |> Map.put(:market_cap, market_cap)
      |> Map.take([:closing_price, :market_cap, :tvl, :date])
    end)
    |> Jason.encode()
    |> case do
      {:ok, data} -> Jason.decode!(data)
      _ -> []
    end
  end
end
