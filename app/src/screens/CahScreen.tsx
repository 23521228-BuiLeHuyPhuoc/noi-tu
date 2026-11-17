import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CAH_CATEGORY_LABELS,
  fillBlackCard,
  type CahCategory,
  type CahView,
} from '../../../shared/src/cah';
import { themeById } from '../../../shared/src/themes';
import type { ActionError, PublicPlayer, RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { C, FONT, sticker } from '../theme';
import { actionText } from '../messages';
import { play } from '../sound';
import { useOnChange } from '../hooks';
import { Button, Card, T } from '../ui';
import { Shell, type StripOptions } from '../components/Shell';
import { CountdownBar } from '../components/TimerBar';
import { Portrait } from '../components/Avatar';
import { NameText } from '../components/Cosmetics';
import { Confetti } from '../components/Fun';
import { EmojiIcon, GameIcon, RankMedal, UiIcon } from '../components/Icons';
import { FlipCard, MotionSurface } from '../components/MotionPrimitives';

const PHASE_META: Record<
  CahView['phase'],
  { badge: string; title: string; subtitle: string; emoji: string }
> = {
  pick: {
    badge: 'GHÉP BÀI LẦY',
    title: 'Chọn Lá Trắng Bựa Nhất',
    subtitle: 'Ướm thử lá Trắng lên câu hỏi Đen rồi bấm Chốt trước khi hết giờ!',
    emoji: '🃏',
  },
  vote: {
    badge: 'BẦU CHỌN ẨN DANH',
    title: 'Ai Ghép Câu Mặn Nhất Phòng?',
    subtitle: 'Tất cả đáp án đều ẩn danh — chạm bầu cho câu khiến bạn cười sặc!',
    emoji: '🗳️',
  },
  reveal: {
    badge: 'LỘ DIỆN TRÙM HỀ',
    title: 'Vinh Danh Tác Giả Vô Tri',
    subtitle: 'Cùng xem ai là chủ nhân pha ghép chữ đi vào lòng đất vòng này!',
    emoji: '🏆',
  },
};

const EXTRA_ERRORS: Partial<Record<ActionError, string>> = {
  not_playing: 'Ván chơi đã kết thúc.',
  spectating: 'Bạn đang xem ván này, chờ ván sau vào bàn nhé!',
  not_your_turn: 'Chưa tới pha thao tác này.',
  bad_action: 'Thao tác chưa hợp lệ, thử lại nhé!',
};

function errOf(reason: ActionError): string {
  return (actionText as Partial<Record<ActionError, string>>)[reason] ?? EXTRA_ERRORS[reason] ?? 'Thao tác không hợp lệ.';
}

/** Tách chuỗi câu Đen để làm nổi bật phần điền chữ «...» hoặc lỗ trống ___ */
function BlackPromptText({ prompt, filledText }: { prompt: string; filledText: string | null }) {
  if (filledText) {
    const combined = fillBlackCard(prompt, filledText);
    const openIdx = combined.indexOf('«');
    const closeIdx = combined.indexOf('»', openIdx + 1);
    if (openIdx !== -1 && closeIdx !== -1) {
      const before = combined.slice(0, openIdx);
      const middle = combined.slice(openIdx, closeIdx + 1);
      const after = combined.slice(closeIdx + 1);
      return (
        <T style={styles.blackPromptTxt}>
          {before}
          <T style={styles.filledHighlight}>{middle}</T>
          {after}
        </T>
      );
    }
    return <T style={styles.blackPromptTxt}>{combined}</T>;
  }

  if (prompt.includes('___')) {
    const [head, ...rest] = prompt.split('___');
    return (
      <T style={styles.blackPromptTxt}>
        {head}
        <T style={styles.blankSlot}>{' [ ___ ] '}</T>
        {rest.join('___')}
      </T>
    );
  }

  return (
    <T style={styles.blackPromptTxt}>
      {prompt}
      <T style={styles.blankSlot}>{' [ ___ ]'}</T>
    </T>
  );
}

export function CahScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as CahView;
  const me = game.me ?? '';
  const theme = themeById(room.settings.roomTheme ?? game.user?.equipped?.roomTheme);
  const { width } = useWindowDimensions();
  const wide = width >= 720;

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const phaseKey = `${view.round}:${view.phase}`;
  const [prevPhaseKey, setPrevPhaseKey] = useState(phaseKey);
  if (prevPhaseKey !== phaseKey) {
    setPrevPhaseKey(phaseKey);
    setSelectedIdx(null);
    setErr(null);
  }

  useOnChange(view.phase, (ph) => {
    if (ph === 'vote') play('reveal');
    else if (ph === 'reveal') {
      play(view.roundWinnerIds.includes(me) ? 'win' : 'sparkle');
    } else if (ph === 'pick') {
      play('turn');
    }
  });

  const inOrder = useMemo(() => view.order.includes(me), [view.order, me]);
  const submittedSet = useMemo(() => new Set(view.submittedIds), [view.submittedIds]);
  const votedSet = useMemo(() => new Set(view.votedIds), [view.votedIds]);
  const winnerSet = useMemo(() => new Set(view.roundWinnerIds), [view.roundWinnerIds]);
  const playerMap = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);

  const sortedScores = useMemo(
    () => [...view.order].sort((a, b) => (view.scores[b] ?? 0) - (view.scores[a] ?? 0)),
    [view.order, view.scores],
  );

  const selectedCard =
    selectedIdx !== null && selectedIdx < view.myHand.length ? view.myHand[selectedIdx] : null;

  const previewWhite = useMemo(() => {
    if (view.phase === 'pick') {
      return view.myPicked ?? selectedCard;
    }
    if (view.phase === 'reveal' && view.entries.length > 0) {
      const winEntry =
        view.entries.find((e) => e.authorId && winnerSet.has(e.authorId)) ??
        [...view.entries].sort((a, b) => b.votes.length - a.votes.length)[0];
      return winEntry?.text ?? null;
    }
    if (view.phase === 'vote' && view.myVote) {
      return view.entries.find((e) => e.slotId === view.myVote)?.text ?? null;
    }
    return null;
  }, [view.phase, view.myPicked, selectedCard, view.entries, winnerSet, view.myVote]);

  const categoryLabel =
    (CAH_CATEGORY_LABELS as Record<string, string>)[view.blackCategory as CahCategory] ??
    view.blackCategory;

  const act = async (payload: Parameters<Game['act']>[0]) => {
    setBusy(true);
    setErr(null);
    const res = await game.act(payload);
    setBusy(false);
    if (!res.ok) {
      play('error');
      setErr(errOf(res.reason));
    }
    return res.ok;
  };

  const handleSelectWhite = (idx: number) => {
    if (view.phase !== 'pick' || view.myPicked !== null || !inOrder) return;
    play('flip');
    setSelectedIdx(idx);
    if (err) setErr(null);
  };

  const handleMulligan = async () => {
    if (busy || !inOrder || view.myPicked !== null || view.myMulliganLeft <= 0) return;
    play('whoosh');
    const ok = await act({ type: 'cah_mulligan' });
    if (ok) setSelectedIdx(null);
  };

  const handleSubmitPick = async () => {
    if (busy || !inOrder || !selectedCard || view.myPicked !== null) return;
    play('stamp');
    await act({ type: 'cah_pick', card: selectedCard });
  };

  const handleVote = async (slotId: string) => {
    if (busy || !inOrder || view.phase !== 'vote') return;
    play('stamp');
    await act({ type: 'cah_vote', slotId });
  };

  const strip: StripOptions = useMemo(
    () => ({
      order: sortedScores,
      active: view.targetPlayerId,
      ring: (p: PublicPlayer) => {
        if (view.phase === 'reveal' && winnerSet.has(p.id)) return C.gold;
        if (view.phase === 'pick' && submittedSet.has(p.id)) return C.jade;
        if (view.phase === 'vote' && votedSet.has(p.id)) return C.gold;
        return undefined;
      },
      sub: (p: PublicPlayer) => {
        const sc = view.scores[p.id] ?? 0;
        if (view.phase === 'reveal' && winnerSet.has(p.id)) return `+1 · ${sc}đ`;
        if (view.phase === 'pick') return submittedSet.has(p.id) ? `Đã nộp · ${sc}đ` : `${sc}đ`;
        if (view.phase === 'vote') return votedSet.has(p.id) ? `Đã bầu · ${sc}đ` : `${sc}đ`;
        return `${sc}đ`;
      },
    }),
    [sortedScores, view.targetPlayerId, view.phase, view.scores, winnerSet, submittedSet, votedSet],
  );

  const meta = PHASE_META[view.phase];

  const renderBottom = () => {
    if (!inOrder) {
      return (
        <T style={[styles.waitNote, { color: theme.onBg }]}>
          Bạn đang ở ghế khán giả thưởng thức đại hội ghép bài vô tri!
        </T>
      );
    }

    if (view.phase === 'pick') {
      const locked = view.myPicked !== null;
      return (
        <View style={styles.dock}>
          {err && (
            <View style={styles.errPill}>
              <UiIcon name="AlertTriangle" size={14} color="#FEF08A" />
              <T style={styles.errTxt}>{err}</T>
            </View>
          )}
          <Button
            testID="cah-submit"
            variant={locked ? 'jade' : 'gold'}
            disabled={busy || locked || !selectedCard}
            iconNode={
              <UiIcon
                name={locked ? 'CheckCircle2' : 'Send'}
                size={18}
                color={locked ? '#FFFFFF' : '#271400'}
              />
            }
            title={
              locked
                ? `Đã chốt bài! Chờ hội bàn tròn (${view.submittedIds.length}/${view.order.length})`
                : selectedCard
                  ? 'Chốt Câu Này!'
                  : 'Chạm 1 lá Trắng ở trên để chốt!'
            }
            onPress={handleSubmitPick}
          />
        </View>
      );
    }

    if (view.phase === 'vote') {
      return (
        <View style={styles.dock}>
          {err && (
            <View style={styles.errPill}>
              <UiIcon name="AlertTriangle" size={14} color="#FEF08A" />
              <T style={styles.errTxt}>{err}</T>
            </View>
          )}
          <View style={styles.voteFooterRow}>
            <EmojiIcon emoji={view.myVote ? '🎉' : '🗳️'} size={18} />
            <T style={[styles.waitNote, { color: view.myVote ? '#6EE7B7' : theme.onBg }]}>
              {view.myVote
                ? `Đã bỏ phiếu! Đang đợi cả phòng (${view.votedIds.length}/${view.order.length})…`
                : `Chạm trực tiếp vào câu hài hước nhất bên trên (${view.votedIds.length}/${view.order.length})`}
            </T>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.voteFooterRow}>
        <EmojiIcon emoji="✨" size={18} />
        <T style={[styles.waitNote, { color: '#FDE047' }]}>
          Chuẩn bị chia lá Đen mới cho vòng kế tiếp…
        </T>
      </View>
    );
  };

  return (
    <Shell game={game} room={room} strip={strip} wide={wide} bottom={renderBottom()}>
      {view.phase === 'reveal' && view.roundWinnerIds.length > 0 && <Confetti />}

      {/* Sân Khấu Lá Bài Đen Hologram */}
      <MotionSurface>
        <LinearGradient
          colors={['#E879F9', '#F59E0B', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.blackStageRim, sticker(4)]}
        >
          <LinearGradient
            testID="cah-black-card"
            colors={['#0B0616', '#1B0E33', '#2E1046']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.blackStageInner}
          >
            <View style={styles.stageTopBar}>
              <View style={styles.roundBadge}>
                <GameIcon name="jester-hat" size={15} color="#FDE047" glow="rgba(250,204,21,0.65)" />
                <T style={styles.roundBadgeTxt}>
                  Vòng {view.round}/{view.maxRounds}
                </T>
              </View>

              <View style={styles.categoryPill}>
                <EmojiIcon emoji="🎭" size={13} />
                <T style={styles.categoryPillTxt}>{categoryLabel}</T>
              </View>

              <View style={styles.phasePill}>
                <EmojiIcon emoji={meta.emoji} size={13} />
                <T style={styles.phasePillTxt}>{meta.badge}</T>
              </View>
            </View>

            <View style={styles.promptBox}>
              <BlackPromptText prompt={view.blackPrompt} filledText={previewWhite} />
            </View>

            <View style={styles.stageStatusRow}>
              <View style={styles.stageHintWrap}>
                <UiIcon name="Sparkles" size={13} color="#C4B5FD" />
                <T numberOfLines={2} style={styles.stageSubTxt}>
                  {previewWhite && view.phase === 'pick'
                    ? view.myPicked
                      ? 'Câu của bạn đã niêm phong gửi lên bàn tròn!'
                      : 'Xem trước độ lầy — ưng bụng là bấm Chốt Câu Này!'
                    : meta.subtitle}
                </T>
              </View>
              <View style={styles.progressCountPill}>
                <T style={styles.progressCountTxt}>
                  {view.phase === 'pick'
                    ? `${view.submittedIds.length}/${view.order.length} nộp`
                    : view.phase === 'vote'
                      ? `${view.votedIds.length}/${view.order.length} bầu`
                      : `${view.entries.length} câu`}
                </T>
              </View>
            </View>

            <CountdownBar
              endsAt={view.phaseEndsAt}
              total={view.phaseSeconds}
              clockOffset={game.clockOffset}
              lightText
              testID="cah-timer"
            />
          </LinearGradient>
        </LinearGradient>
      </MotionSurface>

      {/* PHA 1: BỘ 7 LÁ TRẮNG TRÊN TAY + ĐỔI BÀI RÁC */}
      {view.phase === 'pick' && (
        <View style={styles.sectionWrap}>
          <View style={styles.handToolbar}>
            <View style={styles.handTitleRow}>
              <EmojiIcon emoji="🃏" size={18} />
              <T style={[styles.sectionTitle, { color: theme.onBg }]}>
                Bộ Bài Trắng Trên Tay ({view.myHand.length})
              </T>
            </View>

            {inOrder && (
              <Button
                testID="cah-mulligan"
                small
                variant="royal"
                disabled={busy || view.myPicked !== null || view.myMulliganLeft <= 0}
                iconNode={<UiIcon name="RefreshCw" size={14} color="#FFFFFF" />}
                title={`Đổi bài rác (còn ${view.myMulliganLeft})`}
                onPress={handleMulligan}
              />
            )}
          </View>

          {inOrder ? (
            <View style={styles.whiteGrid}>
              {view.myHand.map((cardText, idx) => {
                const isSubmittedCard = view.myPicked === cardText;
                const isDraftSelected = view.myPicked === null && selectedIdx === idx;
                const active = isSubmittedCard || isDraftSelected;
                const lockedOther = view.myPicked !== null && !isSubmittedCard;

                return (
                  <Pressable
                    key={`${idx}-${cardText}`}
                    testID={`cah-white-${idx}`}
                    disabled={busy || view.myPicked !== null}
                    onPress={() => handleSelectWhite(idx)}
                    style={({ pressed }) => [
                      styles.whiteCardOuter,
                      { flexBasis: wide ? '31.8%' : '48.4%' },
                      sticker(active ? 4 : 2),
                      active && styles.whiteCardActive,
                      pressed && view.myPicked === null && { transform: [{ scale: 0.98 }] },
                      lockedOther && { opacity: 0.52 },
                    ]}
                  >
                    <LinearGradient
                      colors={
                        active
                          ? ['#FFFBEB', '#FEF3C7', '#FDE68A']
                          : ['#FFFFFF', '#F8FAFC', '#F1F5F9']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.whiteCardInner}
                    >
                      <View style={styles.whiteCardHead}>
                        <View style={[styles.cardNumBadge, active && styles.cardNumBadgeOn]}>
                          <T style={[styles.cardNumTxt, active && styles.cardNumTxtOn]}>
                            #{idx + 1}
                          </T>
                        </View>
                        {isSubmittedCard ? (
                          <View style={styles.pickedTag}>
                            <UiIcon name="CheckCircle2" size={12} color="#065F46" />
                            <T style={styles.pickedTagTxt}>ĐÃ CHỐT</T>
                          </View>
                        ) : isDraftSelected ? (
                          <View style={styles.draftTag}>
                            <UiIcon name="Sparkles" size={12} color="#92400E" />
                            <T style={styles.draftTagTxt}>ĐANG CHỌN</T>
                          </View>
                        ) : (
                          <EmojiIcon emoji="✨" size={13} />
                        )}
                      </View>

                      <T style={[styles.whiteCardText, active && styles.whiteCardTextActive]}>
                        {cardText}
                      </T>
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Card style={styles.spectatorWaitCard}>
              <EmojiIcon emoji="🤡" size={28} />
              <T style={styles.spectatorCardTxt}>
                Các cao thủ đang âm thầm chọn lá bài vô tri nhất trên tay…
              </T>
            </Card>
          )}
        </View>
      )}

      {/* PHA 2 & 3: DANH SÁCH CÂU GHÉP ẨN DANH / LỘ DIỆN TÁC GIẢ */}
      {(view.phase === 'vote' || view.phase === 'reveal') && (
        <View style={styles.sectionWrap}>
          {view.phase === 'reveal' && view.roundWinnerIds.length > 0 && (
            <MotionSurface>
              <LinearGradient
                colors={['#FEF08A', '#FACC15', '#F59E0B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.winnerBanner, sticker(3)]}
              >
                <EmojiIcon emoji="👑" size={26} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T style={styles.winnerBannerLabel}>QUÁN QUÂN ĐỘ MẶN VÒNG {view.round}</T>
                  <T style={styles.winnerBannerNames}>
                    {view.roundWinnerIds.map((id) => view.names[id] ?? id).join(' & ')} (+1 điểm)
                  </T>
                </View>
                <EmojiIcon emoji="🤣" size={26} />
              </LinearGradient>
            </MotionSurface>
          )}

          <View style={styles.entriesGrid}>
            {view.entries.map((entry, idx) => {
              const voteTestId = entry.slotId.startsWith('s')
                ? `cah-vote-${entry.slotId}`
                : `cah-vote-s${idx}`;
              const isMine =
                entry.authorId === me || (view.myPicked !== null && entry.text === view.myPicked);
              const iVotedThis = view.myVote === entry.slotId;
              const isWinner =
                view.phase === 'reveal' &&
                ((entry.authorId ? winnerSet.has(entry.authorId) : false) ||
                  (view.roundWinnerIds.length === 0 && entry.votes.length > 0));
              const authorPlayer = entry.authorId ? playerMap.get(entry.authorId) : undefined;
              const fullSentence = fillBlackCard(view.blackPrompt, entry.text);

              const canTapVote = view.phase === 'vote' && inOrder && !isMine && !busy;

              return (
                <FlipCard
                  key={entry.slotId}
                  flipped={view.phase === 'reveal'}
                  style={{ flexBasis: wide ? '48.8%' : '100%', flexGrow: 1 }}
                >
                  <Pressable
                    testID={voteTestId}
                    disabled={!canTapVote}
                    onPress={() => handleVote(entry.slotId)}
                    style={({ pressed }) => [
                      styles.entryCardOuter,
                      sticker(isWinner || iVotedThis ? 4 : 2),
                      iVotedThis && styles.entryVotedMe,
                      isWinner && styles.entryWinnerCard,
                      isMine && view.phase === 'vote' && styles.entryMineCard,
                      pressed && canTapVote && { transform: [{ scale: 0.985 }] },
                    ]}
                  >
                    <LinearGradient
                      colors={
                        isWinner
                          ? ['#FFFBEB', '#FEF08A', '#FDE68A']
                          : iVotedThis
                            ? ['#ECFDF5', '#D1FAE5', '#FFFFFF']
                            : isMine && view.phase === 'vote'
                              ? ['#F8FAFC', '#F1F5F9', '#E2E8F0']
                              : ['#FFFFFF', '#FDF4FF', '#FAF5FF']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.entryCardInner}
                    >
                      <View style={styles.entryTopRow}>
                        <View style={styles.anonCodeBadge}>
                          <EmojiIcon emoji={isWinner ? '🏆' : '🎭'} size={13} />
                          <T style={styles.anonCodeTxt}>Câu #{idx + 1}</T>
                        </View>

                        {view.phase === 'vote' && isMine && (
                          <View style={styles.selfBanBadge}>
                            <UiIcon name="Lock" size={12} color="#9A3412" />
                            <T style={styles.selfBanTxt}>Bài của bạn (cấm tự khen!)</T>
                          </View>
                        )}

                        {view.phase === 'vote' && !isMine && iVotedThis && (
                          <View style={styles.myVoteBadge}>
                            <UiIcon name="CheckCircle2" size={13} color="#065F46" />
                            <T style={styles.myVoteTxt}>Phiếu của bạn</T>
                          </View>
                        )}

                        {view.phase === 'vote' && !isMine && !iVotedThis && inOrder && (
                          <View style={styles.tapVoteInvite}>
                            <EmojiIcon emoji="😂" size={13} />
                            <T style={styles.tapVoteTxt}>Chạm bầu!</T>
                          </View>
                        )}

                        {view.phase === 'reveal' && (
                          <View
                            style={[
                              styles.voteCountBadge,
                              entry.votes.length > 0 && styles.voteCountBadgeHot,
                            ]}
                          >
                            <EmojiIcon emoji="🔥" size={13} />
                            <T
                              style={[
                                styles.voteCountTxt,
                                entry.votes.length > 0 && { color: '#9A3412' },
                              ]}
                            >
                              {entry.votes.length} phiếu
                            </T>
                          </View>
                        )}
                      </View>

                      <T style={styles.entrySentenceTxt}>{fullSentence}</T>

                      <View style={styles.whitePunchlineBox}>
                        <T style={styles.whitePunchlineTxt}>Đáp án: «{entry.text}»</T>
                      </View>

                      {view.phase === 'reveal' && (
                        <View style={styles.revealAuthorBar}>
                          {authorPlayer ? (
                            <Portrait
                              p={authorPlayer}
                              size={30}
                              frame={authorPlayer.cosmetics?.frame}
                            />
                          ) : (
                            <UiIcon name="User" size={18} color={C.muted} />
                          )}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <NameText
                              fx={authorPlayer?.cosmetics?.nameFx}
                              style={styles.authorNameTxt}
                            >
                              {entry.authorName ?? view.names[entry.authorId ?? ''] ?? 'Ẩn danh'}
                            </NameText>
                            {entry.votes.length > 0 && (
                              <T numberOfLines={1} style={styles.votersSubTxt}>
                                Được bầu bởi:{' '}
                                {entry.votes.map((vid) => view.names[vid] ?? vid).join(', ')}
                              </T>
                            )}
                          </View>
                          {isWinner && <EmojiIcon emoji="👑" size={20} />}
                        </View>
                      )}
                    </LinearGradient>
                  </Pressable>
                </FlipCard>
              );
            })}
          </View>
        </View>
      )}

      {/* Bảng Vàng Độ Mặn */}
      <Card style={styles.scoreCard}>
        <View style={styles.scoreHead}>
          <EmojiIcon emoji="🏆" size={17} />
          <T style={styles.scoreTitle}>Bảng Vàng Độ Mặn</T>
        </View>
        <View style={styles.scoreList}>
          {sortedScores.map((id, i) => {
            const p = playerMap.get(id);
            const sc = view.scores[id] ?? 0;
            const roundWon = view.phase === 'reveal' && winnerSet.has(id);
            return (
              <View key={id} style={[styles.scoreRow, id === me && styles.scoreRowMe]}>
                <RankMedal rank={i + 1} size={20} />
                {p && <Portrait p={p} size={28} frame={p.cosmetics?.frame} />}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <NameText fx={p?.cosmetics?.nameFx} style={styles.scoreName}>
                    {view.names[id] ?? id}
                  </NameText>
                </View>
                {roundWon && (
                  <View style={styles.plusOneBadge}>
                    <EmojiIcon emoji="🤣" size={12} />
                    <T style={styles.plusOneTxt}>+1</T>
                  </View>
                )}
                <T style={styles.scoreVal}>{sc} điểm</T>
              </View>
            );
          })}
        </View>
      </Card>
    </Shell>
  );
}

const styles = StyleSheet.create({
  blackStageRim: {
    borderRadius: 24,
    padding: 2.5,
  },
  blackStageInner: {
    borderRadius: 22,
    padding: 14,
    gap: 10,
  },
  stageTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  roundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(253,224,71,0.35)',
  },
  roundBadgeTxt: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FDE047',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(232,121,249,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(232,121,249,0.45)',
  },
  categoryPillTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F5D0FE',
  },
  phasePill: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(56,189,248,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.42)',
  },
  phasePillTxt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#BAE6FD',
    letterSpacing: 0.3,
  },
  promptBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.56)',
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  blackPromptTxt: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '900',
    color: '#F8FAFC',
    fontFamily: FONT,
  },
  filledHighlight: {
    color: '#FDE047',
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
  blankSlot: {
    color: '#F472B6',
    fontWeight: '900',
  },
  stageStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stageHintWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stageSubTxt: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#DDD6FE',
  },
  progressCountPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(250,204,21,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.42)',
  },
  progressCountTxt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FEF08A',
  },

  sectionWrap: {
    gap: 8,
  },
  handToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  handTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
  },

  whiteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  whiteCardOuter: {
    flexGrow: 1,
    minWidth: 148,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(15,23,42,0.14)',
  },
  whiteCardActive: {
    borderColor: '#F59E0B',
    borderWidth: 2.5,
    transform: [{ translateY: -2 }],
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 0 18px rgba(245, 158, 11, 0.55)' } as object)
      : null),
  },
  whiteCardInner: {
    padding: 11,
    minHeight: 88,
    justifyContent: 'space-between',
    gap: 8,
    flex: 1,
  },
  whiteCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  cardNumBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  cardNumBadgeOn: {
    backgroundColor: '#F59E0B',
  },
  cardNumTxt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#334155',
  },
  cardNumTxtOn: {
    color: '#271400',
  },
  pickedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#A7F3D0',
  },
  pickedTagTxt: {
    fontSize: 10,
    fontWeight: '900',
    color: '#065F46',
  },
  draftTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#FDE68A',
  },
  draftTagTxt: {
    fontSize: 10,
    fontWeight: '900',
    color: '#92400E',
  },
  whiteCardText: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '800',
    color: '#0F172A',
  },
  whiteCardTextActive: {
    color: '#451A03',
    fontWeight: '900',
  },

  spectatorWaitCard: {
    alignItems: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  spectatorCardTxt: {
    fontSize: 13,
    fontWeight: '800',
    color: C.muted,
    textAlign: 'center',
  },

  winnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 2,
    borderColor: '#B45309',
  },
  winnerBannerLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#78350F',
    letterSpacing: 0.5,
  },
  winnerBannerNames: {
    fontSize: 16,
    fontWeight: '900',
    color: '#271400',
  },

  entriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  entryCardOuter: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(15,23,42,0.16)',
  },
  entryVotedMe: {
    borderColor: '#10B981',
    borderWidth: 2.5,
  },
  entryWinnerCard: {
    borderColor: '#D97706',
    borderWidth: 3,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 0 22px rgba(250, 204, 21, 0.6)' } as object)
      : null),
  },
  entryMineCard: {
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
  },
  entryCardInner: {
    padding: 13,
    gap: 8,
  },
  entryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  anonCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#EDE9FE',
  },
  anonCodeTxt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#5B21B6',
  },
  selfBanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#FFEDD5',
    borderWidth: 1,
    borderColor: '#FB923C',
  },
  selfBanTxt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#9A3412',
  },
  myVoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#A7F3D0',
  },
  myVoteTxt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#065F46',
  },
  tapVoteInvite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#FCE7F3',
  },
  tapVoteTxt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#9D174D',
  },
  voteCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  voteCountBadgeHot: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  voteCountTxt: {
    fontSize: 12,
    fontWeight: '900',
    color: '#475569',
  },
  entrySentenceTxt: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  whitePunchlineBox: {
    backgroundColor: 'rgba(109, 40, 217, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
  },
  whitePunchlineTxt: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#4C1D95',
  },
  revealAuthorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15,23,42,0.1)',
  },
  authorNameTxt: {
    fontSize: 13,
    fontWeight: '900',
    color: C.ink,
  },
  votersSubTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
  },

  scoreCard: {
    padding: 13,
    gap: 8,
  },
  scoreHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: C.ink,
  },
  scoreList: {
    gap: 5,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  scoreRowMe: {
    backgroundColor: '#FEF9C3',
    borderWidth: 1,
    borderColor: 'rgba(217,119,6,0.32)',
  },
  scoreName: {
    fontSize: 13,
    fontWeight: '800',
    color: C.ink,
  },
  plusOneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#FDE68A',
  },
  plusOneTxt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#92400E',
  },
  scoreVal: {
    fontSize: 13,
    fontWeight: '900',
    color: C.ink,
  },

  dock: {
    gap: 6,
  },
  voteFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  waitNote: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  errPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#991B1B',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  errTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FEF08A',
  },
});
