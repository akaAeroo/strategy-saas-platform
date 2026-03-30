#!/usr/bin/env bash
#
# 智能策略平台 - 配置工具
# 用于配置公司内部 Minimax API Key
#

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# 路径定义
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/packages/backend"
ENV_FILE="$BACKEND_DIR/.env"

echo ""
echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║       智能策略平台 - 公司大模型配置工具                     ║${RESET}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${RESET}"
echo ""

# 检查项目目录
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}错误：找不到后端目录 $BACKEND_DIR${RESET}"
    echo "请确保在正确的项目目录下运行此脚本"
    exit 1
fi

# 功能菜单
show_menu() {
    echo ""
    echo -e "${CYAN}请选择操作：${RESET}"
    echo ""
    echo "  1) 配置公司 Minimax API Key"
    echo "  2) 查看当前配置"
    echo "  3) 测试 AI 连接"
    echo "  4) 切换 AI 提供商 (OpenCode/Minimax)"
    echo "  5) 退出"
    echo ""
}

# 配置 Minimax API Key
configure_minimax() {
    echo ""
    echo -e "${BOLD}${CYAN}━━━ 配置公司 Minimax API Key ━━━${RESET}"
    echo ""
    
    # 获取网关地址
    echo -e "${YELLOW}步骤 1/3: 配置网关地址${RESET}"
    echo "默认网关: http://10.4.16.154:5029/v1"
    read -rp "请输入网关地址 [直接回车使用默认]: " gateway_url
    gateway_url="${gateway_url:-http://10.4.16.154:5029/v1}"
    
    # 获取 API Key
    echo ""
    echo -e "${YELLOW}步骤 2/3: 配置 API Key${RESET}"
    echo "请从公司网关获取 API Key"
    echo "网关地址: https://gateway.xrtan.cn:5029"
    echo ""
    read -rsp "请输入 API Key (输入不会显示): " api_key
    echo ""
    
    if [ -z "$api_key" ]; then
        echo -e "${RED}错误：API Key 不能为空${RESET}"
        return 1
    fi
    
    # 确认配置
    echo ""
    echo -e "${YELLOW}步骤 3/3: 确认配置${RESET}"
    echo ""
    echo -e "网关地址: ${GREEN}$gateway_url${RESET}"
    echo -e "API Key:  ${GREEN}${api_key:0:10}...${RESET}"
    echo -e "模型:     ${GREEN}MiniMax-M2.5 (星探·源曦)${RESET}"
    echo ""
    read -rp "确认保存配置? (y/n): " confirm
    
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        # 备份旧配置
        if [ -f "$ENV_FILE" ]; then
            cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d%H%M%S)"
        fi
        
        # 写入配置
        cat > "$ENV_FILE" << EOF
# ============================================
# 智能策略平台 - 后端配置
# ============================================

PORT=3001

# ============================================
# AI模型配置 - 公司内网 Minimax (星探·源曦)
# ============================================
AI_PROVIDER=minimax

# 公司内网模型配置
MINIMAX_API_KEY=$api_key
MINIMAX_BASE_URL=$gateway_url
MINIMAX_MODEL=MiniMax-M2.5

# ============================================
# 公司云端数据API配置（可选）
# ============================================
AUDIENCE_API_URL=
AUDIENCE_API_KEY=

# ============================================
# CORS 配置
# ============================================
CORS_ORIGIN=http://localhost:5173
EOF
        
        echo ""
        echo -e "${GREEN}✓ 配置已保存到 $ENV_FILE${RESET}"
        echo -e "${YELLOW}请重启后端服务使配置生效:${RESET}"
        echo "  cd packages/backend && npm start"
    else
        echo -e "${YELLOW}配置已取消${RESET}"
    fi
}

# 查看当前配置
show_config() {
    echo ""
    echo -e "${BOLD}${CYAN}━━━ 当前配置 ━━━${RESET}"
    echo ""
    
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${YELLOW}配置文件不存在，请先配置${RESET}"
        return 1
    fi
    
    echo -e "配置文件: ${GREEN}$ENV_FILE${RESET}"
    echo ""
    
    # 读取并显示配置
    if grep -q "AI_PROVIDER" "$ENV_FILE"; then
        provider=$(grep "AI_PROVIDER" "$ENV_FILE" | cut -d= -f2)
        echo -e "AI 提供商: ${GREEN}$provider${RESET}"
    fi
    
    if grep -q "MINIMAX_BASE_URL" "$ENV_FILE"; then
        url=$(grep "MINIMAX_BASE_URL" "$ENV_FILE" | cut -d= -f2)
        echo -e "网关地址:  ${GREEN}$url${RESET}"
    fi
    
    if grep -q "MINIMAX_MODEL" "$ENV_FILE"; then
        model=$(grep "MINIMAX_MODEL" "$ENV_FILE" | cut -d= -f2)
        echo -e "模型:      ${GREEN}$model${RESET}"
    fi
    
    if grep -q "MINIMAX_API_KEY" "$ENV_FILE"; then
        key=$(grep "MINIMAX_API_KEY" "$ENV_FILE" | cut -d= -f2)
        if [ -n "$key" ]; then
            echo -e "API Key:   ${GREEN}${key:0:15}...${RESET}"
        else
            echo -e "API Key:   ${RED}未设置${RESET}"
        fi
    fi
}

# 测试 AI 连接
test_connection() {
    echo ""
    echo -e "${BOLD}${CYAN}━━━ 测试 AI 连接 ━━━${RESET}"
    echo ""
    
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}错误：配置文件不存在${RESET}"
        return 1
    fi
    
    # 读取配置
    api_key=$(grep "MINIMAX_API_KEY" "$ENV_FILE" | cut -d= -f2)
    base_url=$(grep "MINIMAX_BASE_URL" "$ENV_FILE" | cut -d= -f2)
    model=$(grep "MINIMAX_MODEL" "$ENV_FILE" | cut -d= -f2)
    
    if [ -z "$api_key" ] || [ -z "$base_url" ]; then
        echo -e "${RED}错误：API Key 或网关地址未配置${RESET}"
        return 1
    fi
    
    echo -e "正在连接: ${CYAN}$base_url${RESET}"
    echo ""
    
    # 测试请求
    response=$(curl -s --max-time 10 -X POST "$base_url/chat/completions" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $api_key" \
        -d '{
            "model": "'"$model"'",
            "messages": [{"role": "user", "content": "你好"}],
            "max_tokens": 20
        }' 2>&1)
    
    if echo "$response" | grep -q "chat.completion"; then
        echo -e "${GREEN}✓ 连接成功！${RESET}"
        echo ""
        echo "响应预览:"
        echo "$response" | grep -o '"content":"[^"]*"' | head -1 | cut -d'"' -f4
    else
        echo -e "${RED}✗ 连接失败${RESET}"
        echo ""
        echo "错误信息:"
        echo "$response" | head -3
    fi
}

# 切换提供商
switch_provider() {
    echo ""
    echo -e "${BOLD}${CYAN}━━━ 切换 AI 提供商 ━━━${RESET}"
    echo ""
    
    echo "可用提供商:"
    echo "  1) Minimax (公司内网 - 推荐)"
    echo "  2) OpenCode (量化派)"
    echo "  3) OpenAI"
    echo ""
    read -rp "请选择 (1-3): " choice
    
    case $choice in
        1)
            provider="minimax"
            model="MiniMax-M2.5"
            ;;
        2)
            provider="opencode"
            model="quantgroup/xingtan"
            ;;
        3)
            provider="openai"
            model="gpt-4"
            ;;
        *)
            echo -e "${RED}无效选择${RESET}"
            return 1
            ;;
    esac
    
    # 更新配置
    if [ -f "$ENV_FILE" ]; then
        sed -i.bak "s/AI_PROVIDER=.*/AI_PROVIDER=$provider/" "$ENV_FILE"
        if grep -q "MINIMAX_MODEL" "$ENV_FILE"; then
            sed -i.bak "s/MINIMAX_MODEL=.*/MINIMAX_MODEL=$model/" "$ENV_FILE"
        fi
        rm -f "$ENV_FILE.bak"
        echo -e "${GREEN}✓ 已切换到 $provider${RESET}"
        echo -e "${YELLOW}请重启后端服务使配置生效${RESET}"
    else
        echo -e "${RED}配置文件不存在${RESET}"
    fi
}

# 主循环
main() {
    while true; do
        show_menu
        read -rp "请输入选项 (1-5): " choice
        
        case $choice in
            1) configure_minimax ;;
            2) show_config ;;
            3) test_connection ;;
            4) switch_provider ;;
            5) 
                echo ""
                echo -e "${GREEN}再见！${RESET}"
                exit 0
                ;;
            *)
                echo -e "${RED}无效选项${RESET}"
                ;;
        esac
    done
}

main
