import { TorScopeItem, ReportImageBlock } from '../types/proposal';

/**
 * Normalizes image blocks for a TorScopeItem, falling back to legacy fields if needed
 * ensuring 100% backward compatibility with existing saved proposals.
 */
export function normalizeTorItemImageBlocks(item: TorScopeItem): ReportImageBlock[] {
  if (Array.isArray(item.imageBlocks) && item.imageBlocks.length > 0) {
    return item.imageBlocks;
  }

  const legacyBlocks: ReportImageBlock[] = [];

  const hasSingle =
    (item.imageLayout === 'single_centered' || item.imageLayout === 'both') &&
    Boolean(item.singleImage?.url);

  if (hasSingle && item.singleImage?.url) {
    legacyBlocks.push({
      id: `legacy-single-${item.id}`,
      type: 'single',
      url: item.singleImage.url,
      caption: item.singleImage.caption || '',
    });
  }

  const hasPair =
    (item.imageLayout === 'two_columns' || item.imageLayout === 'both') &&
    Boolean(item.twoColumnImageLeft?.url || item.twoColumnImageRight?.url);

  if (hasPair) {
    legacyBlocks.push({
      id: `legacy-pair-${item.id}`,
      type: 'pair',
      leftUrl: item.twoColumnImageLeft?.url,
      leftCaption: item.twoColumnImageLeft?.caption || '',
      rightUrl: item.twoColumnImageRight?.url,
      rightCaption: item.twoColumnImageRight?.caption || '',
    });
  }

  return legacyBlocks;
}

export function createEmptySingleImageBlock(defaultCaption?: string): ReportImageBlock {
  return {
    id: `img-single-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: 'single',
    url: undefined,
    caption: defaultCaption || '',
  };
}

export function createEmptyPairImageBlock(defaultLeftCaption?: string, defaultRightCaption?: string): ReportImageBlock {
  return {
    id: `img-pair-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: 'pair',
    leftUrl: undefined,
    leftCaption: defaultLeftCaption || '',
    rightUrl: undefined,
    rightCaption: defaultRightCaption || '',
  };
}
