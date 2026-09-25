import UIKit
import React

@objc(SceneDelegate)
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    print("### SceneDelegate CALLED")

    guard let windowScene = scene as? UIWindowScene else {
      print("### ERROR: not a UIWindowScene")
      return
    }
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
      print("### ERROR: AppDelegate cast failed")
      return
    }
    guard let factory = appDelegate.reactNativeFactory else {
      print("### ERROR: reactNativeFactory is nil")
      return
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    print("### Starting React Native")
    factory.startReactNative(
      withModuleName: "Commun",
      in: window,
      launchOptions: nil
    )
    window.makeKeyAndVisible()
  }
}