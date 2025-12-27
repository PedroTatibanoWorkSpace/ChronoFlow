export const ALLOWED_METHODS = ['POST', 'GET', 'PUT', 'PATCH', 'DELETE'] as const;
export const ALLOWED_TARGETS = ['HTTP', 'MESSAGE'] as const;

type TargetCarrier = { targetType?: string };

export const isHttpTarget = (o: TargetCarrier): boolean =>
  (o.targetType ?? 'HTTP') === 'HTTP';

export const isMessageTarget = (o: TargetCarrier): boolean =>
  (o.targetType ?? 'MESSAGE') === 'MESSAGE';
