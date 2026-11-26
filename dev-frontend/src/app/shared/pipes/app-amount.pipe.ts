import { Pipe, PipeTransform } from '@angular/core';
import { formatAmount } from '../../core/utils/formatters';

@Pipe({
  name: 'appAmount',
  standalone: true,
})
export class AppAmountPipe implements PipeTransform {
  transform(value: unknown): string {
    return formatAmount(value);
  }
}
