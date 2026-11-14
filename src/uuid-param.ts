import { Param, ParseUUIDPipe } from '@nestjs/common';

export function UUIDParam(name: string): ParameterDecorator {
  return Param(name, new ParseUUIDPipe({ version: '4' }));
}
