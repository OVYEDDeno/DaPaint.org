import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';

interface FAQModalProps {
  onClose: () => void;
}

export const FAQModal: React.FC<FAQModalProps> = ({ onClose }) => {
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);

  const faqData = [
    {
      question: 'Is this real?',
      answer:
        'Yes. DaPaint runs real daily head-to-head challenges with cash prizes. Lock in to compete in the live pool.',
    },
    {
      question: 'What are the challenges?',
      answer:
        'Create your DaPaint and enter a 1:1 showdown. Each challenge runs for a set window and only one DaPaint wins.',
    },
    {
      question: 'Who can enter?',
      answer: "Everyone. That's why it's fair.",
    },
    {
      question: 'How do I start?',
      answer:
        'Sign up, create your DaPaint, then tap lock in. You can also join from the feed if a slot is open.',
    },
    {
      question: 'What happens when I lock in?',
      answer:
        "Your DaPaint goes live against another entry. You'll see it in your active feed until the challenge ends.",
    },
    {
      question: 'Can I just watch?',
      answer:
        "Yes. Browse the feed, explore DaPaints, and join when you're ready to compete.",
    },
    {
      question: 'What devices are supported?',
      answer:
        'DaPaint works on mobile and web. The experience adapts to both, including keyboard handling on mobile.',
    },
    {
      question: 'Do I need an account?',
      answer:
        "Yes. You'll sign in with a username and password so we can keep your DaPaints and prizes tied to you.",
    },
    {
      question: 'Lock in or watch someone else rep your people?',
      answer: 'Your choice.',
    },
  ];

  if (showSubmissionForm) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Ask a Question</Text>
          <Pressable onPress={() => setShowSubmissionForm(false)}>
            <Text style={styles.closeButton}>x</Text>
          </Pressable>
        </View>
        <Text style={styles.description}>
          Submit your question and we'll get back to you soon.
        </Text>
        <View style={styles.formPlaceholder}>
          <Text style={styles.placeholderText}>Question Submission Form</Text>
        </View>
        <Pressable style={styles.submitButton}>
          <Text style={styles.submitButtonText}>Submit Question</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Frequently Asked Questions</Text>
          <Text style={styles.subtitle}>
            Quick answers before you get started
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close FAQ"
        >
          <Text style={styles.closeButton}>x</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {faqData.map((faq, index) => (
          <View
            key={index}
            style={[
              styles.faqItem,
              index !== faqData.length - 1 && styles.faqItemDivider,
            ]}
          >
            <Text style={styles.question}>{faq.question}</Text>
            <Text style={styles.answer}>{faq.answer}</Text>
          </View>
        ))}
      </ScrollView>

      <Pressable
        style={styles.askButton}
        onPress={() => setShowSubmissionForm(true)}
      >
        <Text style={styles.askButtonText}>Ask a Question</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  answer: {
    color: '#4f6b77',
    fontSize: 14,
    lineHeight: 20,
  },
  askButton: {
    alignItems: 'center',
    backgroundColor: '#005c82',
    borderRadius: 10,
    height: 46,
    justifyContent: 'center',
    marginTop: 12,
  },
  askButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    color: '#005c82',
    fontSize: 24,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  container: {
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0,92,130,0.18)',
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '78%',
    maxWidth: Platform.OS === 'web' ? 640 : 520,
    paddingHorizontal: 20,
    paddingVertical: 18,
    width: '92%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0px 6px 14px rgba(0,0,0,0.18)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
        elevation: 6,
      },
    }),
  },
  description: {
    color: '#666',
    fontSize: 16,
    marginBottom: 20,
  },
  faqItem: {
    paddingVertical: 14,
  },
  faqItemDivider: {
    borderBottomColor: 'rgba(0,92,130,0.12)',
    borderBottomWidth: 1,
  },
  formPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 20,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
  question: {
    color: '#003d57',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  scrollContainer: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 12,
    paddingTop: 8,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#005c82',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: '#4f6b77',
    fontSize: 13,
    marginTop: 4,
  },
  title: {
    color: '#005c82',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
