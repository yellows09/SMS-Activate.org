import { BASE_URL, EApiActions } from '../../ressources/comon';
import { singleton } from 'tsyringe';
import { EApiErrors, RequestErrors } from '../../ressources/errors';
import {IProxyOptions} from "../../ressources/options";
import axios, { AxiosRequestConfig } from 'axios';
import {HttpsProxyAgent} from 'https-proxy-agent';

@singleton()
export class Query {
  private baseUrl: string;
  private apiKey: string | null;
  private proxy: IProxyOptions;

  async setApiKey(baseUrl: string, apiKey?: string, proxy?: IProxyOptions) {
    this.apiKey = apiKey || process.env.SMS_ACTIVATE_API_KEY;
    this.baseUrl = baseUrl;
    this.proxy = proxy;
  }

  makeCall(
      action: EApiActions,
      query?: any
  ): Promise<any> {
    query = query || {};

    if (process.env.SMS_ACTIVATE_DEBUG)
      console.log('Call >', EApiActions[action], query);
    let apiKey = this.apiKey
    if(query.apiKey !== undefined){
      apiKey = query.apiKey;
    }

    return new Promise<any>((resolve, reject) => {
      if (!apiKey) return reject(new Error(RequestErrors.MissingApiKey));

      const axiosConfig: AxiosRequestConfig = {
        params: {
          api_key: apiKey,
          action: EApiActions[action],
          ...query,
        },
      };

      if (this.proxy) {
        const proxyUrl = `${this.proxy.protocol}://${this.proxy.username}:${this.proxy.password}@${this.proxy.ip}:${this.proxy.port}`;
        const agent = new HttpsProxyAgent(proxyUrl);
        axiosConfig.httpsAgent = agent;
      }

      axios
          .get(this.baseUrl, axiosConfig)
          .then((result) => {
            if (process.env.SMS_ACTIVATE_DEBUG)
              console.debug('Success |', result.data);
            if (typeof result.data == 'string' && EApiErrors[result.data])
              return reject(new Error(EApiErrors[result.data] + ' : ' + EApiActions[action] + ' : ' + apiKey));
            resolve(result.data);
          })
          .catch((error) => {
            if (process.env.SMS_ACTIVATE_DEBUG) console.error('Catch |', error);
            reject(error);
          });
    });
  }
}
