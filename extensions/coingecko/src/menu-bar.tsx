import { MenuBarExtra, open, environment, LaunchType } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';

import Service from './service';
import { getFavorites, getMenuBarIndex, setMenuBarIndex } from './storage';
import { formatPrice, getPreferredCurrency } from './utils';

export default function MenuBar() {
  const currency = getPreferredCurrency();

  const { data, isLoading } = useCachedPromise(async () => {
    const favoriteIds = await getFavorites();

    if (favoriteIds.length === 0) {
      return { favorites: [], currentIndex: 0 };
    }

    let index = await getMenuBarIndex();

    // Rotate on background refresh
    if (environment.launchType === LaunchType.Background) {
      index = (index + 1) % favoriteIds.length;
      await setMenuBarIndex(index);
    }

    // Ensure index is valid
    if (index >= favoriteIds.length) {
      index = 0;
      await setMenuBarIndex(index);
    }

    const service = new Service();
    const marketData = await service.getMarketData(favoriteIds, currency.id);

    // Preserve favorites order
    const favorites = favoriteIds
      .map((id) => marketData.find((coin) => coin.id === id))
      .filter((coin): coin is { id: string; symbol: string; price: number } => coin !== undefined);

    return { favorites, currentIndex: index };
  });

  const favorites = data?.favorites ?? [];
  const current = favorites[data?.currentIndex ?? 0];
  const title = current
    ? `${current.symbol.toUpperCase()} ${formatPrice(current.price, currency.id)}`
    : 'No favorites';

  return (
    <MenuBarExtra title={title} isLoading={isLoading}>
      {favorites.map((fav) => (
        <MenuBarExtra.Item
          key={fav.id}
          title={fav.symbol.toUpperCase()}
          subtitle={formatPrice(fav.price, currency.id)}
          onAction={() => open(`https://www.coingecko.com/en/coins/${fav.id}`)}
        />
      ))}
    </MenuBarExtra>
  );
}
