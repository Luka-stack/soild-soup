import { ArgumentsHost, BadRequestException, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';

@Catch(BadRequestException)
export class AllExceptionsFilter extends BaseWsExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const callback = host.getArgByIndex(2);
    if (callback && typeof callback === 'function') {
      callback(exception.getResponse());
    }
  }
}
