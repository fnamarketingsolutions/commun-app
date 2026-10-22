#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(CommunCookies, NSObject)
RCT_EXTERN_METHOD(getAll:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(setJwt:(NSString *)token
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
