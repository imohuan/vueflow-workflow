import type { Component } from "vue";

/**
 * 配置字段类型
 */
export type FieldType =
  | "input" // 文本输入
  | "textarea" // 多行文本
  | "number" // 数字输入
  | "select" // 下拉选择
  | "switch" // 开关
  | "checkbox" // 复选框
  | "radio" // 单选框
  | "color" // 颜色选择器
  | "file" // 文件上传
  | "json-editor" // JSON 编辑器
  | "code-editor"; // 代码编辑器

/**
 * 验证规则类型
 */
export interface ValidationRule {
  /** 规则类型 */
  type: "min" | "max" | "url" | "email" | "pattern" | "custom";
  /** 规则值 */
  value?: any;
  /** 错误提示信息 */
  message?: string;
  /** 自定义验证函数 */
  validator?: (value: any) => boolean | string;
}

/**
 * 选项配置
 */
export interface Option {
  /** 显示标签 */
  label: string;
  /** 选项值 */
  value: any;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 配置字段定义
 */
export interface ConfigField {
  /** 配置键 */
  key: string;
  /** 显示标签 */
  label: string;
  /** 字段类型 */
  type: FieldType;
  /** 默认值 */
  default: any;
  /** 描述信息 */
  description?: string;
  /** 是否必填 */
  required?: boolean;
  /** 验证规则 */
  validation?: ValidationRule[];
  /** 选项列表（用于 select、radio、checkbox） */
  options?: Option[];
  /** 占位符 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义属性 */
  [key: string]: any;
}

/**
 * 配置分组
 */
export interface ConfigSection {
  /** 分组 ID */
  id: string;
  /** 分组标题 */
  title: string;
  /** 分组描述 */
  description?: string;
  /** 分组图标 */
  icon?: Component;
  /** 字段列表 */
  fields: ConfigField[];
}

/**
 * 配置 Schema
 */
export interface ConfigSchema {
  /** 配置分组列表 */
  sections: ConfigSection[];
}

