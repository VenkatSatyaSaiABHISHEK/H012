import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Paper,
  Card,
  CardContent,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  SmartToy,
  Send,
  Lightbulb,
  TrendingUp,
  Security,
  Nature,
  Schedule,
  Warning,
  CheckCircle,
  Close
} from '@mui/icons-material';

interface AIAssistantProps {
  open: boolean;
  onClose: () => void;
}

interface AIResponse {
  id: string;
  type: 'user' | 'assistant';
  message: string;
  timestamp: Date;
  suggestions?: string[];
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ open, onClose }) => {
  const [messages, setMessages] = useState<AIResponse[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState(!apiKey);

  useEffect(() => {
    if (open && !showApiKeyInput) {
      // Initialize with welcome message and smart suggestions
      const welcomeMessage: AIResponse = {
        id: 'welcome',
        type: 'assistant',
        message: "🤖 Hi! I'm your Smart Home AI Assistant. I can help you optimize your devices, analyze energy usage, and provide intelligent automation suggestions. What would you like to know?",
        timestamp: new Date(),
        suggestions: [
          "How can I reduce my energy costs?",
          "Optimize my device schedule",
          "Analyze my usage patterns",
          "Create automation rules",
          "Security recommendations"
        ]
      };
      setMessages([welcomeMessage]);
    }
  }, [open, showApiKeyInput]);

  const saveApiKey = () => {
    localStorage.setItem('openai_api_key', apiKey);
    setShowApiKeyInput(false);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: AIResponse = {
      id: Date.now().toString(),
      type: 'user',
      message: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Simulate AI response (replace with real OpenAI API call)
      await new Promise(resolve => setTimeout(resolve, 1500));

      const aiResponse = generateSmartResponse(inputMessage);

      const assistantMessage: AIResponse = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        message: aiResponse.message,
        timestamp: new Date(),
        suggestions: aiResponse.suggestions
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Assistant error:', error);
      const errorMessage: AIResponse = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        message: "Sorry, I'm having trouble connecting to my AI services. Please check your API key or try again later.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSmartResponse = (input: string): { message: string; suggestions?: string[] } => {
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('energy') || lowerInput.includes('cost') || lowerInput.includes('power')) {
      return {
        message: "⚡ **Energy Optimization Analysis:**\n\n• **Current Status**: Your devices are consuming ~180W average\n• **Peak Hours**: 7-9 PM (higher electricity rates)\n• **Recommendation**: Shift non-critical devices to off-peak hours (11 PM - 6 AM)\n• **Potential Savings**: $15-25/month\n\n**Smart Actions:**\n- Auto-schedule water heater for off-peak hours\n- Reduce standby power consumption\n- Enable smart thermostat learning mode",
        suggestions: [
          "Create automated schedule",
          "Show peak hour usage",
          "Set up cost alerts",
          "Enable eco mode"
        ]
      };
    }

    if (lowerInput.includes('schedule') || lowerInput.includes('automat') || lowerInput.includes('routine')) {
      return {
        message: "📅 **Smart Automation Suggestions:**\n\n• **Morning Routine**: Lights on at 6:30 AM, coffee maker starts 6:45 AM\n• **Evening Routine**: Security system armed at 11 PM, non-essential devices off\n• **Away Mode**: All lights off, thermostat to eco mode, security cameras active\n• **Weather-Based**: Sprinkler system adjusts based on rain forecast\n\n**Advanced Features:**\n- Voice control integration\n- Geofencing triggers\n- Seasonal adjustments",
        suggestions: [
          "Create morning routine",
          "Set up away mode",
          "Weather automations",
          "Voice commands"
        ]
      };
    }

    if (lowerInput.includes('security') || lowerInput.includes('safe') || lowerInput.includes('monitor')) {
      return {
        message: "🔒 **Security Analysis & Recommendations:**\n\n• **Current Status**: 3 devices with security features active\n• **Vulnerabilities**: 2 devices need firmware updates\n• **Network Security**: WPA3 encryption recommended\n\n**Action Items:**\n- Enable 2FA on all smart devices\n- Set up unusual activity alerts\n- Create backup access codes\n- Regular security audits scheduled",
        suggestions: [
          "Update device firmware",
          "Security audit report",
          "Set up alerts",
          "Backup access setup"
        ]
      };
    }

    if (lowerInput.includes('usage') || lowerInput.includes('pattern') || lowerInput.includes('analytic')) {
      return {
        message: "📊 **Usage Pattern Analysis:**\n\n• **Most Active**: Living room devices (60% daily usage)\n• **Peak Usage**: 7-9 PM weekdays, 2-6 PM weekends\n• **Efficiency Score**: 73/100 (Good, can improve)\n• **Trends**: 12% increase in usage this month\n\n**Insights:**\n- Kitchen appliances run during peak hours (expensive)\n- HVAC system could be more efficient\n- Some devices left on standby unnecessarily",
        suggestions: [
          "Detailed usage report",
          "Efficiency improvements",
          "Cost breakdown",
          "Trend analysis"
        ]
      };
    }

    // Default helpful response
    return {
      message: "🤖 I understand you're looking for help with your smart home system. Here are some areas where I can provide intelligent assistance:\n\n• **Energy Management**: Reduce costs and optimize consumption\n• **Automation**: Create smart schedules and routines\n• **Security**: Monitor and protect your devices\n• **Analytics**: Understand your usage patterns\n• **Troubleshooting**: Solve device connectivity issues\n\nWhat specific aspect would you like me to help with?",
      suggestions: [
        "Energy optimization tips",
        "Create smart routines",
        "Security recommendations",
        "Usage analytics"
      ]
    };
  };

  const useSuggestion = (suggestion: string) => {
    setInputMessage(suggestion);
  };

  if (showApiKeyInput) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <SmartToy />
            <Typography variant="h6">Setup AI Assistant</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              To enable AI-powered smart home assistance, you need an OpenAI API key.
              This will unlock intelligent automation suggestions, energy optimization, and natural language device control.
            </Typography>
          </Alert>

          <TextField
            fullWidth
            label="OpenAI API Key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            helperText="Get your API key from https://platform.openai.com/api-keys"
            sx={{ mb: 2 }}
          />

          <Typography variant="body2" color="text.secondary">
            <strong>AI Assistant Features:</strong><br />
            • Smart energy optimization recommendations<br />
            • Intelligent automation suggestions<br />
            • Natural language device control<br />
            • Predictive maintenance alerts<br />
            • Usage pattern analysis<br />
            • Security monitoring insights
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={saveApiKey} variant="contained" disabled={!apiKey.trim()}>
            Save & Activate AI
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <SmartToy />
            <Typography variant="h6">AI Smart Home Assistant</Typography>
            <Chip label="Powered by GPT" size="small" color="primary" />
          </Box>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ height: 400, overflow: 'auto', mb: 2 }}>
          {messages.map((message) => (
            <Box key={message.id} sx={{ mb: 2 }}>
              <Card sx={{
                bgcolor: message.type === 'user' ? 'primary.main' : 'background.paper',
                color: message.type === 'user' ? 'primary.contrastText' : 'text.primary',
                ml: message.type === 'user' ? 4 : 0,
                mr: message.type === 'user' ? 0 : 4
              }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    {message.type === 'assistant' && <SmartToy fontSize="small" />}
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      {message.type === 'assistant' ? 'AI Assistant' : 'You'} • {message.timestamp.toLocaleTimeString()}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                    {message.message}
                  </Typography>

                  {message.suggestions && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {message.suggestions.map((suggestion, index) => (
                        <Chip
                          key={index}
                          label={suggestion}
                          size="small"
                          variant="outlined"
                          onClick={() => useSuggestion(suggestion)}
                          sx={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          ))}

          {isLoading && (
            <Box display="flex" alignItems="center" gap={2} sx={{ ml: 2, mb: 2 }}>
              <SmartToy />
              <Typography variant="body2" color="text.secondary">
                AI is thinking...
              </Typography>
            </Box>
          )}
        </Box>

        <Box display="flex" gap={2}>
          <TextField
            fullWidth
            placeholder="Ask me about energy optimization, automation, security, or device troubleshooting..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            disabled={isLoading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={sendMessage} disabled={!inputMessage.trim() || isLoading}>
                    <Send />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip icon={<Lightbulb />} label="Energy Tips" size="small" onClick={() => useSuggestion("How can I reduce my energy costs?")} />
          <Chip icon={<Schedule />} label="Smart Schedule" size="small" onClick={() => useSuggestion("Create automation rules for my devices")} />
          <Chip icon={<Security />} label="Security Check" size="small" onClick={() => useSuggestion("Analyze my security status")} />
          <Chip icon={<TrendingUp />} label="Usage Report" size="small" onClick={() => useSuggestion("Show my device usage patterns")} />
        </Box>
      </DialogContent>
    </Dialog>
  );
};