import { useEffect, useState } from 'react';
import { matchingService } from '../services';
import type { RequestState, SampleProfile } from '../types';

export function useSampleProfiles() {
  const [state, setState] = useState<RequestState<readonly SampleProfile[]>>({ status: 'loading' });

  useEffect(() => {
    let isCurrent = true;
    matchingService
      .listSampleProfiles()
      .then((data) => isCurrent && setState({ status: 'success', data }))
      .catch(() => isCurrent && setState({ status: 'error', message: 'Could not load the sample profiles.' }));
    return () => {
      isCurrent = false;
    };
  }, []);

  return state;
}
