// lib/services/biometric_gate.dart
//
// 生物识别门（TASK-EXT-10，对应需求 §34）。
// 进入「反思」入口前调用系统生物识别，成功才进入，失败不进入。
// 不自制指纹 UI；不保存、不上传任何生物特征数据——local_auth 只返回布尔结果。
import 'package:local_auth/local_auth.dart';

/// 验证结果：成功 / 不可用（设备没设置或没录指纹）/ 失败（用户取消或验证未过）。
class BiometricResult {
  final bool success;
  final String? failReason; // 中文提示，供 UI 直接展示
  const BiometricResult.success()
      : success = true,
        failReason = null;
  const BiometricResult.failure(this.failReason) : success = false;
}

/// 可注入的验证门（测试用假实现替换）。
abstract class BiometricGate {
  Future<BiometricResult> authenticate();
}

/// 本地实现：调系统生物识别（指纹/人脸，由系统 TEE 处理，App 拿不到特征）。
class LocalBiometricGate implements BiometricGate {
  final LocalAuthentication _auth;
  LocalBiometricGate({LocalAuthentication? auth})
      : _auth = auth ?? LocalAuthentication();

  @override
  Future<BiometricResult> authenticate() async {
    try {
      // 优先生物识别；设备没录指纹/人脸时，回退到系统锁屏凭据（密码/PIN/图案），
      // 仍由系统验证本人（local_auth 只返回布尔，不碰生物特征数据）。
      final canCheck = await _auth.canCheckBiometrics;
      final hasDeviceCredential = await _auth.isDeviceSupported();
      if (!canCheck && !hasDeviceCredential) {
        return const BiometricResult.failure(
            '设备未设置任何锁屏方式（指纹/人脸/密码），请在系统「设置 → 安全」中设置后重试');
      }
      final ok = await _auth.authenticate(
        localizedReason: '验证身份后进入反思',
        options: const AuthenticationOptions(
          biometricOnly: false, // 允许回退设备凭据，避免没录指纹就进不去
          stickyAuth: true,
        ),
      );
      if (ok) return const BiometricResult.success();
      return const BiometricResult.failure('验证未通过或已取消');
    } catch (_) {
      return const BiometricResult.failure('生物识别调用失败，请重试');
    }
  }
}
