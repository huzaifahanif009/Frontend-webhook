import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AppConfigService } from '../services/app-config.service';

/** Attaches the configured backend API key as X-Api-Key on every outgoing request. */
export const apiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  const apiKey = inject(AppConfigService).get().apiKey;

  if (!apiKey) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { 'X-Api-Key': apiKey } }));
};
