import Foundation
import React

@objc(CommunCookies)
class CommunCookies: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc(getAll:rejecter:)
  func getAll(
    _ resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    let cookies = HTTPCookieStorage.shared.cookies ?? []
    let header = HTTPCookie.requestHeaderFields(with: cookies)["Cookie"]
    resolver(header ?? NSNull())
  }

  @objc(setJwt:resolver:rejecter:)
  func setJwt(
    _ token: String,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    let props: [HTTPCookiePropertyKey: Any] = [
      .name: "jwt",
      .value: token,
      .domain: "api.commun.in",
      .path: "/",
      .secure: "TRUE",
    ]
    if let cookie = HTTPCookie(properties: props) {
      HTTPCookieStorage.shared.setCookie(cookie)
    }
    resolver(true)
  }
}
