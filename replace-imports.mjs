import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname, resolve, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcDir = resolve(__dirname, 'src');
const files = [];

// 排除的路径前缀（不进行替换）
const excludePaths = ['icons', 'volt'];

// 递归获取所有文件
function getAllFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (/\.(ts|vue|js|tsx|jsx|css)$/.test(file)) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

// 检查路径是否应该被排除
function shouldExclude(importPath) {
  return excludePaths.some(exclude => importPath.startsWith(exclude + '/') || importPath === exclude);
}

// 计算相对路径
function getRelativePath(fromFile, toPath) {
  const fileDir = dirname(fromFile);
  let targetPath = resolve(srcDir, toPath);

  // 检查目标是否存在
  let stat;
  try {
    stat = statSync(targetPath);
  } catch {
    // 文件不存在，尝试添加常见扩展名
    const extensions = ['.ts', '.vue', '.js', '.tsx', '.jsx'];
    let found = false;
    for (const ext of extensions) {
      const testPath = targetPath + ext;
      try {
        if (statSync(testPath).isFile()) {
          targetPath = testPath;
          found = true;
          break;
        }
      } catch { }
    }
    if (!found) {
      // 如果还是找不到，尝试作为目录查找 index 文件
      try {
        stat = statSync(targetPath);
      } catch {
        // 如果目录也不存在，使用原始路径（让构建工具处理）
        targetPath = resolve(srcDir, toPath);
      }
    }
  }

  // 如果目标是目录，尝试查找 index 文件
  try {
    stat = statSync(targetPath);
    if (stat.isDirectory()) {
      const indexFiles = ['index.ts', 'index.vue', 'index.js', 'index.tsx'];
      for (const indexFile of indexFiles) {
        const testPath = join(targetPath, indexFile);
        try {
          if (statSync(testPath).isFile()) {
            targetPath = testPath;
            break;
          }
        } catch { }
      }
    }
  } catch { }

  let relativePath = relative(fileDir, targetPath);
  relativePath = relativePath.replace(/\\/g, '/');

  // 如果路径不以 ./ 或 ../ 开头，添加 ./
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }

  // 处理文件扩展名
  const targetExt = extname(relativePath);
  if (targetExt && ['.ts', '.vue', '.js', '.tsx', '.jsx'].includes(targetExt)) {
    // 如果是 index 文件，移除文件名
    if (relativePath.endsWith('/index' + targetExt)) {
      relativePath = relativePath.slice(0, -('/index' + targetExt).length);
      if (relativePath === '.') {
        relativePath = './';
      } else if (relativePath === '') {
        relativePath = './';
      }
    } else {
      // 对于 .vue 文件，保留扩展名（相对导入需要）
      // 对于其他文件（.ts, .js 等），可以移除扩展名
      if (targetExt !== '.vue') {
        relativePath = relativePath.slice(0, -targetExt.length);
      }
      // .vue 文件保留 .vue 后缀
    }
  }

  return relativePath;
}

// 获取所有文件
const allFiles = getAllFiles(srcDir);

// 处理每个文件
allFiles.forEach(filePath => {
  try {
    let content = readFileSync(filePath, 'utf-8');
    const originalContent = content;
    const fileDir = dirname(filePath);
    let modified = false;

    // 匹配 from '@/' 导入
    content = content.replace(/from\s+['"]@\/([^'"]+)['"]/g, (match, importPath) => {
      // 检查是否应该排除
      if (shouldExclude(importPath)) {
        return match; // 不替换
      }
      try {
        const relativePath = getRelativePath(filePath, importPath);
        modified = true;
        return match.replace(`@/${importPath}`, relativePath);
      } catch (error) {
        console.warn(`警告: 无法解析路径 ${importPath} 在文件 ${filePath}`);
        return match;
      }
    });

    // 匹配 import '@/' 导入
    content = content.replace(/import\s+['"]@\/([^'"]+)['"]/g, (match, importPath) => {
      // 检查是否应该排除
      if (shouldExclude(importPath)) {
        return match; // 不替换
      }
      try {
        const relativePath = getRelativePath(filePath, importPath);
        modified = true;
        return match.replace(`@/${importPath}`, relativePath);
      } catch (error) {
        console.warn(`警告: 无法解析路径 ${importPath} 在文件 ${filePath}`);
        return match;
      }
    });

    // 匹配 require('@/') 导入
    content = content.replace(/require\(['"]@\/([^'"]+)['"]\)/g, (match, importPath) => {
      // 检查是否应该排除
      if (shouldExclude(importPath)) {
        return match; // 不替换
      }
      try {
        const relativePath = getRelativePath(filePath, importPath);
        modified = true;
        return match.replace(`@/${importPath}`, relativePath);
      } catch (error) {
        console.warn(`警告: 无法解析路径 ${importPath} 在文件 ${filePath}`);
        return match;
      }
    });

    // 处理 CSS 导入中的 @/
    content = content.replace(/@import\s+['"]@\/([^'"]+)['"]/g, (match, importPath) => {
      // 检查是否应该排除
      if (shouldExclude(importPath)) {
        return match; // 不替换
      }
      try {
        const relativePath = getRelativePath(filePath, importPath);
        modified = true;
        return match.replace(`@/${importPath}`, relativePath);
      } catch (error) {
        console.warn(`警告: 无法解析路径 ${importPath} 在文件 ${filePath}`);
        return match;
      }
    });

    // 如果内容有变化，写入文件
    if (modified && content !== originalContent) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ 已处理: ${relative(__dirname, filePath)}`);
      files.push(filePath);
    }
  } catch (error) {
    console.error(`✗ 处理失败: ${relative(__dirname, filePath)}`, error.message);
  }
});

console.log(`\n总共处理了 ${files.length} 个文件`);

